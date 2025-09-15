import React, { useRef } from "react";
import { View, Text, Image, Animated, PanResponder, StyleSheet } from "react-native";
import { TMDB_IMAGE_BASE, SCREEN_WIDTH } from "../config";
import { styles } from "../theme";

// Varsayılan poster görselini projeden dahil eder
const DEFAULT_POSTER = require("../../assets/default_poster.jpeg");

// Kaydırılabilir film kartı bileşeni: Filmleri listelemek ve sola kaydırarak kaldırmak için kullanılır
export default function SwipeableMovieCard({ movie, index, onDismiss }) {
    // Kartın sürüklenme pozisyonunu takip etmek için animasyon değeri oluşturur
    const pan = useRef(new Animated.ValueXY()).current;

    // Sürükleme hareketlerini algılamak ve yönetmek için PanResponder oluşturur
    const panResponder = useRef(
        PanResponder.create({
            // Dokunma hareketi başladığında devreye girip girmeyeceğini belirler
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Sadece sola doğru ve belli bir hareket miktarından sonra tepki verir
                return gestureState.dx < -20;
            },
            // Sürükleme işlemi devam ederken çalışır
            onPanResponderMove: (evt, gestureState) => {
                // Pozitif (sağa) hareketi engeller, sadece sola izin verir
                if (gestureState.dx < 0) {
                    pan.setValue({ x: gestureState.dx, y: 0 });
                }
            },
            // Sürükleme işlemi bittiğinde (parmak çekildiğinde) çalışır
            onPanResponderRelease: (evt, gestureState) => {
                // Eğer kart yeterince sola çekildiyse (-120 birim)
                if (gestureState.dx < -120) {
                    // Kartı tamamen ekran dışına animasyonla gönderir
                    Animated.timing(pan, {
                        toValue: { x: -SCREEN_WIDTH, y: 0 },
                        duration: 200,
                        useNativeDriver: false,
                    }).start(() => onDismiss(movie, "left"));
                } else {
                    // Yeterince çekilmediyse kartı başlangıç pozisyonuna geri getirir
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    // Sola kaydırma sırasında arkaplandaki kırmızı alanın opaklığını ayarlar
    const opacityLeft = pan.x.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0],
        extrapolate: "clamp"
    });

    // Poster görselinin URL'ini hazırlar, yoksa null döner
    const pUrl = movie?.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null;

    // Filmin uyumluluk skorunu yüzdelik formata çevirir
    const score = typeof movie.hybrid_score === "number"
        ? `%${(movie.hybrid_score * 100).toFixed(0)}`
        : "-";

    // Bileşenin görsel yapısını render eder
    return (
        <View style={{ marginBottom: 12 }}>
            {/* Arkaplan: Kırmızı alan ve ikonlar */}
            <View style={[styles.recCard, { position: 'absolute', width: '100%', borderWidth: 0, backgroundColor: "#000" }]}>
                <View style={{ flex: 1 }} />
                <Animated.View style={{
                    flex: 1,
                    backgroundColor: '#B22222', // Koyu kırmızı
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingRight: 20,
                    opacity: opacityLeft
                }}>
                </Animated.View>
            </View>

            {/* Ön Yüz: Film bilgileri ve poster */}
            <Animated.View
                style={[styles.recCard, { transform: [{ translateX: pan.x }], backgroundColor: '#1a1a1a', marginBottom: 0 }]}
                {...panResponder.panHandlers}
            >
                <Image
                    source={pUrl ? { uri: pUrl } : DEFAULT_POSTER}
                    style={styles.recImage}
                    resizeMode="cover"
                />
                <View style={styles.recContent}>
                    <Text style={styles.recTitle} numberOfLines={2}>
                        {index + 1}. {movie.title ?? "Başlık yok"}
                    </Text>
                    <Text style={styles.recScore}>Uyumluluk: {score}</Text>
                    <Text style={styles.recOverview} numberOfLines={3}>
                        {movie.overview ?? "Film hakkında detaylı bilgi bulunmuyor."}
                    </Text>
                    <Text style={{ color: '#888', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                        (Kaldırmak için sola kaydır ⬅️)
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
}
