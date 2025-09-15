import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    Animated,
    PanResponder,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    SURVEY_MOVIES,
    RECOMMEND,
    TMDB_SEARCH_URL,
    TMDB_API_KEY,
    TMDB_IMAGE_BASE,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
} from "../config";
import { styles } from "../theme";
import {
    getMovieIdFromObj,
    getRandomSample,
    fetchWithTimeout,
    enrichWithTMDB,
} from "../utils";

// Varsayılan poster görseli (bulunamayanlar için)
const DEFAULT_POSTER = require("../../assets/default_poster.jpeg");

// Anket Ekranı: Kullanıcının film tercihlerini öğrenmek için sağa/sola kaydırma (tinder-like) arayüzü sunar.
export default function SurveyScreen({ userId, loggedIn, apiBase }) {
    // --- STATE TANIMLARI ---
    const [movies, setMovies] = useState([]);       // Gösterilecek film listesi
    const [index, setIndex] = useState(0);          // Şu anki filmin indisi
    const [loading, setLoading] = useState(true);   // Filmler yükleniyor mu?

    // Kullanıcı tercihleri
    const [liked, setLiked] = useState([]);         // Beğenilen filmler (Sağa kaydırma)
    const [disliked, setDisliked] = useState([]);   // Beğenilmeyen filmler (Sola kaydırma)
    const [unknown, setUnknown] = useState([]);     // Bilinmeyen/İzlenmeyen filmler (Aşağı kaydırma)

    // Öneri Sonuçları
    const [recs, setRecs] = useState(null);         // Hesaplanan öneriler listesi
    const [sending, setSending] = useState(false);  // Sonuçlar gönderiliyor mu?
    const [error, setError] = useState(null);       // Genel hata durumu

    // Ekstra Öneri İsteme
    const [moreLoading, setMoreLoading] = useState(false); // Ek öneri yükleniyor mu?
    const [moreError, setMoreError] = useState(null);      // Ek öneri hatası

    // --- ANİMASYON DEĞERLERİ ---
    const position = useRef(new Animated.ValueXY()).current; // Kartın X,Y konumu

    // Kartın X konumuna göre arka plan rengi değişimi (Sağ: Yeşilimsi, Sol: Kırmızımsı)
    const bgFromX = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ["#400000", "#000000ff", "#003300"],
        extrapolate: "clamp",
    });

    // Aşağı kaydırırken çıkan gri overlay'in opaklığı
    const downOverlayOpacity = position.y.interpolate({
        inputRange: [0, SCREEN_HEIGHT / 3],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    // Kartın sağa/sola hareketiyle hafifçe dönmesi
    const rotate = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ["-10deg", "0deg", "10deg"],
        extrapolate: "clamp",
    });

    // Şu an ekranda olan film
    const currentMovie = movies[index] ?? null;

    // --- KAYDIRMA MANTIĞI ---
    const handleSwipe = (direction, movie) => {
        if (!movie) return;

        // Hedef konumu belirle (ekrandan uçup gitmesi için)
        let toValue = { x: 0, y: 0 };
        if (direction === "right") toValue = { x: SCREEN_WIDTH, y: 0 };
        else if (direction === "left") toValue = { x: -SCREEN_WIDTH, y: 0 };
        else if (direction === "down") toValue = { x: 0, y: SCREEN_HEIGHT };

        // Animasyonu başlat
        Animated.timing(position, {
            toValue,
            duration: 200,
            useNativeDriver: false,
        }).start(() => {
            // Animasyon bitince listelere ekle
            if (direction === "right") setLiked((p) => [...p, movie]);
            else if (direction === "left") setDisliked((p) => [...p, movie]);
            else if (direction === "down") setUnknown((p) => [...p, movie]);

            // Pozisyonu sıfırla ve bir sonraki filme geç
            position.setValue({ x: 0, y: 0 });
            setIndex((p) => p + 1);
        });
    };

    // Dokunma ve sürükleme algılayıcı
    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true, // Dokunmayı yakala
        onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }), // Hareketi takip et
        onPanResponderRelease: (_, g) => {
            const threshold = 80; // Tetikleme eşiği (piksel)
            const { dx, dy } = g;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (!currentMovie) return;

            // Yönü belirle ve aksiyon al
            if (absX > absY && dx > threshold) handleSwipe("right", currentMovie);      // Sağa (Beğen)
            else if (absX > absY && dx < -threshold) handleSwipe("left", currentMovie);   // Sola (Beğenme)
            else if (absY > absX && dy > threshold) handleSwipe("down", currentMovie);    // Aşağı (Bilmiyorum)
            else {
                // Eşik geçilmediyse kartı yerine geri getir
                Animated.spring(position, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false,
                }).start();
            }
        },
    });

    // Backend'e gönderilecek puanlama verisini hazırla
    const buildRatingsPayload = () => {
        // Beğenilenlere 4.0 puan ver
        const likeRatings = liked
            .map((m) => ({ movieId: getMovieIdFromObj(m), rating: 4.0 }))
            .filter((r) => r.movieId != null);

        // Beğenilmeyenlere 2.0 puan ver
        const dislikeRatings = disliked
            .map((m) => ({ movieId: getMovieIdFromObj(m), rating: 2.0 }))
            .filter((r) => r.movieId != null);

        const ratings = [...likeRatings, ...dislikeRatings];
        const payload = { ratings };

        if (loggedIn && userId) payload.user_id = Number(userId);

        return payload;
    };

    // --- VEYİ ÇEKME (FİLMLERİ GETİR) ---
    // Sayfa açıldığında çalışır: Filmleri çeker ve arka planda posterleri yüklemeye başlar
    useEffect(() => {
        const fetchMovies = async () => {
            const t0 = Date.now();
            const url = SURVEY_MOVIES(apiBase);

            console.log("🎬 [Survey] fetchMovies START:", new Date().toISOString());
            console.log("🌐 [Survey] URL:", url);

            try {
                setLoading(true);
                setError(null);

                console.log("📡 [Survey] FETCH start:", new Date().toISOString());
                const res = await fetchWithTimeout(url, {}, 8000);

                console.log(
                    "✅ [Survey] FETCH done:",
                    new Date().toISOString(),
                    "| status:",
                    res.status,
                    "| ms:",
                    Date.now() - t0
                );

                const json = await res.json();

                // Dönen veriyi diziye çevir
                const baseList = Array.isArray(json)
                    ? json
                    : json?.movies || json?.items || [];

                console.log("📦 [Survey] baseList length:", baseList.length);

                // İlk 100 filmden rastgele 20 tanesini seç
                const top100 = baseList.slice(0, 100);
                const sampled = getRandomSample(top100, 20);

                console.log("🎯 [Survey] sampled length:", sampled.length);

                // Veriyi normalize et
                const normalized = sampled.map((m) => ({
                    movieId: getMovieIdFromObj(m),
                    title: m.title ?? m.movie_title ?? String(m.name ?? ""),
                    popularity: typeof m.popularity === "number" ? m.popularity : 0,
                    poster_path: null, // Başlangıçta poster yok
                }));

                console.log("🧼 [Survey] normalized sample(5):", normalized.slice(0, 5));

                // 1) Filmleri hemen ekrana bas (Posterler sonra gelecek)
                setMovies(normalized);

                console.log(
                    "🏁 [Survey] movies set (without posters):",
                    new Date().toISOString(),
                    "| ms:",
                    Date.now() - t0
                );

                // 2) Posterleri asenkron olarak arka planda getir
                console.log("🖼️ [Survey] TMDB poster background fetch DISPATCHED");

                normalized.forEach(async (m, idx) => {
                    if (!m.title) return;

                    try {
                        const searchUrl = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
                            m.title
                        )}&language=en-US`;

                        const tmdbRes = await fetchWithTimeout(searchUrl, {}, 4000);
                        const tmdbJson = await tmdbRes.json();
                        const first = tmdbJson?.results?.[0];
                        const posterPath = first?.poster_path || null;

                        // State'i güncelle (Sadece ilgili filmin posterini ekle)
                        setMovies((prev) =>
                            prev.map((x) =>
                                x.movieId === m.movieId ? { ...x, poster_path: posterPath } : x
                            )
                        );

                        if (idx < 3) console.log("✅ [TMDB] poster ok:", m.title, posterPath);
                    } catch (e) {
                        if (idx < 3)
                            console.log("❌ [TMDB] poster fail:", m.title, e?.name, e?.message);
                    }
                });
            } catch (e) {
                console.log("❌ [Survey] fetchMovies ERROR:", e?.name, e?.message);
                setError(
                    e?.name === "AbortError"
                        ? "Backend yanıt vermedi (timeout). Android emülatörde 10.0.2.2 kullan."
                        : "Backend'e bağlanılamadı. IP/Port yanlış olabilir."
                );
                setMovies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [apiBase]);

    // --- SONUÇLARI GÖNDER VE ÖNERİ AL ---
    const sendRatingsToBackend = async () => {
        try {
            setSending(true);
            setError(null);
            setMoreError(null);

            const payload = buildRatingsPayload();
            if (!payload.ratings || payload.ratings.length === 0) {
                setRecs([]);
                return;
            }

            // Anket bitince 10 tane öneri iste
            const url = `${RECOMMEND(apiBase)}?n_recs=10`;

            const res = await fetchWithTimeout(
                url,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
                12000
            );

            const json = await res.json();
            const list = Array.isArray(json) ? json : json?.recommendations || [];

            // Önerileri zenginleştir (Poster vb.)
            const enriched = await enrichWithTMDB(list);
            setRecs(enriched);
        } catch (e) {
            console.log("❌ recommend fail:", e?.name, e?.message);
            setError("Öneriler alınırken hata oluştu.");
        } finally {
            setSending(false);
        }
    };

    // --- DAHA FAZLA ÖNERİ GETİR ---
    const fetchMoreRecommendations = async () => {
        try {
            setMoreLoading(true);
            setMoreError(null);

            const payload = buildRatingsPayload();
            if (!payload.ratings || payload.ratings.length === 0) return;

            // Zaten gösterilenleri hariç tut (Exclude listesi oluştur)
            const excludeSet = new Set();
            (recs || []).forEach((m) => {
                const id = getMovieIdFromObj(m);
                if (id != null) excludeSet.add(Number(id));
            });
            (payload.ratings || []).forEach((r) => {
                if (r.movieId != null) excludeSet.add(Number(r.movieId));
            });

            payload.exclude_movie_ids = Array.from(excludeSet);

            const url = `${RECOMMEND(apiBase)}?n_recs=10`;

            const res = await fetchWithTimeout(
                url,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
                12000
            );

            const json = await res.json();
            const list = Array.isArray(json) ? json : json?.recommendations || [];

            // Backend bazen ignore edebilir, biz client tarafında da filtreleyelim
            const existing = new Set(payload.exclude_movie_ids || []);
            const filtered = list.filter((m) => {
                const id = getMovieIdFromObj(m);
                return id != null && !existing.has(Number(id));
            });

            const enriched = await enrichWithTMDB(filtered);

            if (enriched.length === 0) {
                setMoreError("Yeni öneri kalmadı 😄");
                return;
            }

            // Yeni önerileri listeye ekle
            setRecs((prev) => [...(prev || []), ...enriched]);
        } catch (e) {
            console.log("❌ more recommend fail:", e?.name, e?.message);
            setMoreError("Yeni öneriler alınamadı.");
        } finally {
            setMoreLoading(false);
        }
    };

    // --- RENDER (YÜKLENİYOR) ---
    if (loading) {
        return (
            <SafeAreaView style={styles.screen}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.subtitle}>Filmler yükleniyor...</Text>
            </SafeAreaView>
        );
    }

    // --- RENDER (HATA) ---
    if (error) {
        return (
            <SafeAreaView style={styles.screen}>
                <Text style={[styles.title, { fontSize: 18 }]}>Hata</Text>
                <Text style={[styles.subtitle, { color: "#ff6b6b" }]}>{error}</Text>
                <Text style={[styles.subtitle, { marginTop: 10 }]}>API: {apiBase}</Text>
            </SafeAreaView>
        );
    }

    // --- RENDER (ANKET BİTTİ - SONUÇLAR) ---
    if (index >= movies.length) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.resultContainer}>
                    <Text style={[styles.title, { marginBottom: 20 }]}>Anket Bitti 🎬</Text>

                    {/* İstatistik Kutuları */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 12, gap: 8 }}>
                        {/* BEĞENDİM */}
                        <View style={{ flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', borderColor: '#333', borderWidth: 1 }}>
                            <Text style={{ fontSize: 18 }}>👍</Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 4, fontSize: 11 }}>Beğendim</Text>
                            <Text style={{ color: '#4caf50', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>{liked.length}</Text>
                        </View>

                        {/* BELİRSİZ */}
                        <View style={{ flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', borderColor: '#333', borderWidth: 1 }}>
                            <Text style={{ fontSize: 18 }}>🤔</Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 4, fontSize: 11 }}>Bilmiyorum</Text>
                            <Text style={{ color: '#ffeb3b', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>{unknown.length}</Text>
                        </View>

                        {/* KÖTÜ */}
                        <View style={{ flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', borderColor: '#333', borderWidth: 1 }}>
                            <Text style={{ fontSize: 18 }}>👎</Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 4, fontSize: 11 }}>Beğenmedim</Text>
                            <Text style={{ color: '#f44336', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>{disliked.length}</Text>
                        </View>
                    </View>

                    {/* Yükleniyor veya Buton */}
                    {sending && (
                        <View style={{ marginTop: 20 }}>
                            <ActivityIndicator size="large" color="#E50914" />
                            <Text style={styles.subtitle}>Yapay zeka düşünüyor...</Text>
                        </View>
                    )}

                    {!sending && !recs && (
                        <TouchableOpacity
                            style={[styles.redButton, { marginTop: 24 }]}
                            onPress={sendRatingsToBackend}
                        >
                            <Text style={styles.redButtonText}>Önerileri Göster</Text>
                        </TouchableOpacity>
                    )}

                    {/* Öneri Sonuçları Listesi */}
                    {recs && recs.length > 0 && (
                        <View style={{ flex: 1, width: "100%", marginTop: 15 }}>
                            <Text
                                style={[
                                    styles.subtitle,
                                    {
                                        textAlign: "left",
                                        marginLeft: 16,
                                        marginBottom: 10,
                                        color: "#fff",
                                        fontWeight: "bold",
                                    },
                                ]}
                            >
                                Senin İçin Seçtiklerimiz:
                            </Text>

                            <ScrollView
                                contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {recs.map((rec, idx) => {
                                    const pUrl = rec.poster_path
                                        ? `${TMDB_IMAGE_BASE}${rec.poster_path}`
                                        : null;

                                    const score =
                                        typeof rec.hybrid_score === "number"
                                            ? `%${(rec.hybrid_score * 100).toFixed(0)}`
                                            : "-";

                                    return (
                                        <View key={`${rec.movieId ?? idx}-${idx}`} style={styles.recCard}>
                                            <Image
                                                source={pUrl ? { uri: pUrl } : DEFAULT_POSTER}
                                                style={styles.recImage}
                                                resizeMode="cover"
                                            />
                                            <View style={styles.recContent}>
                                                <Text style={styles.recTitle} numberOfLines={2}>
                                                    {idx + 1}. {rec.title ?? "Başlık yok"}
                                                </Text>
                                                <Text style={styles.recScore}>Uyumluluk: {score}</Text>
                                                <Text style={styles.recOverview} numberOfLines={3}>
                                                    {rec.overview ?? "Film hakkında detaylı bilgi bulunmuyor."}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}

                                {/* Daha Fazla Öneri Butonu */}
                                <View style={{ marginTop: 8, marginBottom: 20 }}>
                                    {moreError && (
                                        <Text
                                            style={{
                                                color: "#ff6b6b",
                                                marginBottom: 8,
                                                textAlign: "center",
                                            }}
                                        >
                                            {moreError}
                                        </Text>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.redButton, { marginTop: 0 }]}
                                        onPress={fetchMoreRecommendations}
                                        disabled={moreLoading}
                                    >
                                        {moreLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.redButtonText}>Başka öneriler ver</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    // --- RENDER (KART GÖSTERİMİ) ---
    const posterUri = currentMovie?.poster_path
        ? `${TMDB_IMAGE_BASE}${currentMovie.poster_path}`
        : null;

    return (
        <Animated.View
            style={[styles.screen, { backgroundColor: bgFromX }]}
            {...panResponder.panHandlers}
        >
            {/* Alt katman (Aşağı çekince kararan overlay) */}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: "#696161ff", opacity: downOverlayOpacity },
                ]}
            />

            <SafeAreaView style={{ flex: 1, width: "100%" }}>
                <View style={styles.surveyHeader}>
                    <Text style={styles.surveyTitle}>Film Anketi</Text>
                </View>

                {/* Kart Konteyneri */}
                <View style={styles.cardContainer}>
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                transform: [
                                    { translateX: position.x },
                                    { translateY: position.y },
                                    { rotate },
                                ],
                            },
                        ]}
                    >
                        <Image
                            source={posterUri ? { uri: posterUri } : DEFAULT_POSTER}
                            style={styles.poster}
                            resizeMode="cover"
                        />

                        <View style={styles.movieInfo}>
                            <Text style={styles.movieTitle}>{currentMovie?.title}</Text>
                            {/* Popularity removed */}
                        </View>
                    </Animated.View>
                </View>

                {/* Alt bilgi */}
                <View style={styles.bottomInfo}>
                    <Text style={styles.bottomText}>Kalan film: {movies.length - index}</Text>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
}

