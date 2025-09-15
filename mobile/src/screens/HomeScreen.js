import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    ImageBackground,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RECOMMEND_USER, RECOMMEND, TMDB_IMAGE_BASE } from "../config";
import { styles as themeStyles } from "../theme"; // Tema dosyasıyla çakışmaması için isim değiştirildi
import { fetchWithTimeout, enrichWithTMDB, getMovieIdFromObj } from "../utils";
import SwipeableMovieCard from "../components/SwipeableMovieCard";

// Yerel görseli dahil et (Arka plan resmi)
import bgImage from "../../assets/bg.jpeg";

// Ana Sayfa Bileşeni: Kullanıcı giriş yaptıysa önerileri, yapmadıysa karşılama ekranını gösterir.
export default function HomeScreen({ navigation, loggedIn, userId, username, isAdmin, onLogout, apiBase }) {
    // State tanımları
    const [todayRecs, setTodayRecs] = useState([]);       // Günün önerileri listesi
    const [recLoading, setRecLoading] = useState(false);  // Öneriler yükleniyor mu?
    const [recError, setRecError] = useState(null);       // Öneri yükleme hatası

    // Günün önerilerini sunucudan çeken asenkron fonksiyon
    const loadTodayRecommendations = async () => {
        // Eğer kullanıcı giriş yapmamışsa veri çekme
        if (!loggedIn || !userId) {
            setTodayRecs([]);
            return;
        }

        try {
            setRecLoading(true);
            setRecError(null);

            // Backend'den kullanıcıya özel önerileri iste (n_recs=2: ikili gösterim)
            const url = `${RECOMMEND_USER(apiBase)}?user_id=${encodeURIComponent(
                userId
            )}&n_recs=2`;

            console.log("🏠 [Home] recommend-user URL:", url);

            // 9 saniye zaman aşımı ile isteği at
            const res = await fetchWithTimeout(url, {}, 9000);
            const json = await res.json();

            // Gelen veriyi dizi formatına getir (bazen {recommendations: []} dönebilir)
            const list = Array.isArray(json) ? json : json?.recommendations || [];

            // TMDB API kullanarak bu filmlerin posterlerini bul
            const enriched = await enrichWithTMDB(list);

            // Listeyi güncelle
            setTodayRecs(enriched.slice(0, 2));
        } catch (e) {
            console.log("❌ [Home] today recs fail:", e?.name, e?.message);
            setRecError("Öneriler alınamadı. Backend/TMDB kontrol et.");
            setTodayRecs([]);
        } finally {
            setRecLoading(false);
        }
    };

    // Bileşen mount olduğunda veya kullanıcı/giriş durumu değiştiğinde çalışır
    useEffect(() => {
        loadTodayRecommendations();
    }, [loggedIn, userId, apiBase]);

    // --- KAYDIRMA İŞLEMİ (DISMISS) ---
    // Kullanıcı bir filmi sola kaydırdığında (beğenmedi/geçti) çalışır
    const handleDismissMovie = async (movie, direction) => {
        console.log(`👋 [Home] Film kaydırıldı (${direction}): ${movie.title} (ID: ${movie.movieId})`);

        // 1. Kullanıcı arayüzünde filmi hemen listeden kaldır (Hızlı tepki için)
        const oldRecs = [...todayRecs];
        setTodayRecs(prev => prev.filter(m => getMovieIdFromObj(m) !== getMovieIdFromObj(movie)));

        // 2. Backend'e bu film için düşük puan (0.5) gönder
        try {
            const payload = {
                ratings: [{ movieId: getMovieIdFromObj(movie), rating: 0.5 }],
                user_id: Number(userId)
            };

            console.log("📤 [Home] Puan gönderiliyor (0.5)...");

            // Backend'e puanı gönderirken aynı zamanda yeni bir öneri de iste
            const recUrl = `${RECOMMEND(apiBase)}?n_recs=5`; // Filtreleme sonrası en az 1 tane gelmesi için 5 istiyoruz

            // Mevcut ekrandaki diğer filmleri ve yeni kaydırılan filmi hariç tutulacaklar listesine ekle
            const currentIds = oldRecs.map(m => getMovieIdFromObj(m)).filter(id => id !== getMovieIdFromObj(movie));
            currentIds.push(getMovieIdFromObj(movie));

            payload.exclude_movie_ids = currentIds;

            console.log("🔄 [Home] Yeni öneri isteniyor:", recUrl);
            const res = await fetchWithTimeout(recUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }, 8000);

            const json = await res.json();
            let newCandidates = Array.isArray(json) ? json : json?.recommendations || [];

            // Eğer yeni aday film geldiyse
            if (newCandidates.length > 0) {
                // İlk adayı al, TMDB ile posterini tamamla
                const enrichedList = await enrichWithTMDB([newCandidates[0]]);
                const newKid = enrichedList[0];

                console.log(`✨ [Home] Yeni film geldi: ${newKid.title}`);
                // Listeye yeni filmi ekle
                setTodayRecs(current => [...current, newKid]);
            } else {
                console.log("⚠️ [Home] Yeni öneri bulunamadı.");
            }

        } catch (e) {
            console.log("❌ [Home] Dismiss error:", e);
        }
    };


    // ---------------------------------------------------------
    // RENDER: GİRİŞ YAPILMAMIŞ (KARŞILAMA EKRANI)
    // ---------------------------------------------------------
    if (!loggedIn) {
        return (
            <ImageBackground source={bgImage} style={styles.backgroundImage} resizeMode="cover">
                {/* Okunabilirliği artırmak için hafif koyu katman */}
                <View style={styles.overlay}>
                    <SafeAreaView style={styles.safeArea}>
                        <StatusBar barStyle="light-content" />
                        <View style={styles.centerContainer}>
                            <Text style={styles.welcomeTitle}>Hoşgeldiniz</Text>
                        </View>

                        <View style={styles.bottomContainer}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate("Survey")}
                            >
                                <Text style={styles.actionButtonText}>Ankete Başla</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate("Login")}
                            >
                                <Text style={styles.actionButtonText}>Giriş Yap</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </ImageBackground>
        );
    }

    // ---------------------------------------------------------
    // RENDER: GİRİŞ YAPILMIŞ (DASHBOARD / ÖNERİLER)
    // ---------------------------------------------------------
    return (
        <SafeAreaView style={themeStyles.screen}>
            <StatusBar barStyle="light-content" />

            <View style={themeStyles.homeContainer}>
                <View style={{ height: 16 }} />

                <Text style={themeStyles.title}>
                    Hoşgeldin {username ? username : userId}
                </Text>
                <View style={{ height: 30 }} />

                {/* Öneriler Bölümü */}
                <View style={{ marginTop: 18, flex: 1 }}>
                    <Text
                        style={[
                            themeStyles.subtitle,
                            {
                                color: "#ffffff",
                                fontWeight: "800",
                                textAlign: "left",
                                marginTop: 0,
                                marginBottom: 10,
                            },
                        ]}
                    >
                        Bugün senin için önerilerimiz
                    </Text>

                    {/* Yükleniyor Göstergesi */}
                    {recLoading && (
                        <View style={{ alignItems: "center", marginTop: 4 }}>
                            <ActivityIndicator color="#E50914" />
                            <Text style={themeStyles.subtitle}>Öneriler hazırlanıyor...</Text>
                        </View>
                    )}

                    {/* Hata Mesajı */}
                    {recError && (
                        <Text style={[themeStyles.subtitle, { color: "#ff6b6b", marginTop: 0 }]}>
                            {recError}
                        </Text>
                    )}

                    {/* Öneri Listesi */}
                    {!recLoading && todayRecs?.length > 0 && (
                        <View style={{ gap: 10 }}>
                            {todayRecs.map((m, idx) => (
                                <SwipeableMovieCard
                                    key={`${m.movieId ?? idx}-${idx}`}
                                    movie={m}
                                    index={idx}
                                    onDismiss={handleDismissMovie}
                                />
                            ))}
                        </View>
                    )}

                    {/* Öneri Yok Mesajı */}
                    {!recLoading && todayRecs.length === 0 && !recError && (
                        <Text style={{ color: '#777', textAlign: 'center', marginTop: 20 }}>
                            Şu an gösterilecek öneri yok.
                        </Text>
                    )}
                </View>

                {/* Alt Aksiyon Butonları */}
                <View style={{ marginBottom: 20 }}>
                    {/* Admin ise Yönetim Paneli butonunu göster */}
                    {isAdmin && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: "#333",
                                paddingVertical: 12,
                                paddingHorizontal: 20,
                                borderRadius: 4,
                                alignItems: "center",
                                marginTop: 10,
                                borderWidth: 1,
                                borderColor: "#555"
                            }}
                            onPress={() => navigation.navigate("Admin", { apiBase })}
                        >
                            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>⚙️ Yönetim Paneli</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[themeStyles.redButton, { marginTop: 24 }]}
                        onPress={() => navigation.navigate("Survey")}
                    >
                        <Text style={themeStyles.redButtonText}>Ankete Başla</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[themeStyles.outlineButton, { marginTop: 16 }]}
                        onPress={onLogout}
                    >
                        <Text style={themeStyles.outlineButtonText}>Çıkış Yap</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// Yerel Stiller (Karşılama ekranı için)
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Yazının okunması için karartma
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        marginBottom: 20,
    },
    bottomContainer: {
        width: '100%',
        gap: 16,
        marginBottom: 40,
    },
    actionButton: {
        backgroundColor: "#000000",
        borderWidth: 1,
        borderColor: "#ffffff",
        paddingVertical: 14,
        borderRadius: 4,
        alignItems: "center",
        width: '100%',
    },
    actionButtonText: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "bold",
    },
});
