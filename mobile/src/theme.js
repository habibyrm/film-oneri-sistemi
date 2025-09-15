import { DefaultTheme } from "@react-navigation/native";
import { StyleSheet, Dimensions } from "react-native";

// Ekran boyutlarını al
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Ekran genişliği 768px'den küçükse mobil cihaz olarak kabul et
const IS_MOBILE = SCREEN_WIDTH <= 768;

// ==========================================
// NAVİGASYON TEMASI
// ==========================================
// Uygulama genelinde React Navigation için koyu tema ayarları
export const DarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: "#000000", // Arka plan tamamen siyah
        card: "#000000",       // Kartlar (header vb.) siyah
        text: "#ffffff",       // Yazılar beyaz
        border: "#111111",     // Kenarlıklar çok koyu gri
    },
};

// ==========================================
// GENEL STİLLER (STYLESHEET)
// ==========================================
export const styles = StyleSheet.create({
    // --- TEMEL EKRAN DÜZENİ ---
    // Tüm ekranların ana kapsayıcısı için stil
    screen: {
        flex: 1,
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
    },

    // --- LOGİN VE KAYIT EKRANLARI ---
    // Giriş yapma ekranı içerik düzeni
    loginContainer: {
        flex: 1,
        width: "100%",
        paddingHorizontal: 24,
        justifyContent: "center",
    },
    // Ana sayfa içerik düzeni
    homeContainer: {
        flex: 1,
        width: "100%",
        paddingHorizontal: 24,
        justifyContent: "center",
    },
    // Büyük başlık stili
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#ffffff",
        textAlign: "center",
    },
    // Alt başlık veya açıklama metni stili
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        textAlign: "center",
        color: "#b3b3b3", // Açık gri
    },

    // --- BUTONLAR ---
    // Kırmızı ana aksiyon butonu (Netflix kırmızısı benzeri)
    redButton: {
        marginTop: 32,
        backgroundColor: "#E50914",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 4,
        alignItems: "center",
    },
    // Kırmızı buton içindeki metin
    redButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Çerçeveli (Outline) ikincil buton
    outlineButton: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#E50914",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
        alignItems: "center",
    },
    // Çerçeveli buton metni
    outlineButtonText: {
        color: "#E50914",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },

    // --- FORM ELEMANLARI ---
    // Metin giriş kutusu (Input)
    input: {
        marginTop: 24,
        borderWidth: 1,
        borderColor: "#333333", // Koyu gri sınır
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#ffffff",
    },

    // --- ANKET EKRANI ---
    // Anket başlık alanı
    surveyHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    // Anket başlık metni
    surveyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#ffffff",
    },
    // Film kartının ortalandığı alan
    cardContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    // Tekil film kartı stili (Tinder benzeri kart)
    card: {
        // Mobilde ekranın %90'ı, büyük ekranda max 420px veya %40'ı
        width: IS_MOBILE ? SCREEN_WIDTH * 0.9 : Math.min(420, SCREEN_WIDTH * 0.4),
        borderRadius: 16,
        backgroundColor: "#111111",
        shadowColor: "#000",
        shadowOpacity: 0.8,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10, // Android gölgesi
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#333333",
    },
    // Kart içindeki poster resmi
    poster: {
        width: "100%",
        // Cihaza göre yükseklik ayarı
        height: IS_MOBILE ? SCREEN_HEIGHT * 0.5 : SCREEN_HEIGHT * 0.6,
    },
    // Kart altındaki film bilgileri alanı
    movieInfo: {
        padding: 12,
    },
    // Film adı
    movieTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#ffffff",
    },
    // Film yayın yılı veya alt bilgi
    movieSub: {
        marginTop: 4,
        color: "#b3b3b3",
    },
    // Ekranın altındaki bilgilendirme alanı
    bottomInfo: {
        paddingBottom: 16,
    },
    // Alt bilgilendirme metni
    bottomText: {
        color: "#b3b3b3",
        textAlign: "center",
    },

    // --- SONUÇ / ÖNERİ EKRANI ---
    // Sonuçların listelendiği ana kapsayıcı
    resultContainer: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 20,
    },
    // Öneri listesindeki her bir film kartı (yatay dikdörtgen)
    recCard: {
        flexDirection: "row",
        backgroundColor: "#1a1a1a", // Koyu gri zemin
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#333",
        height: 140,
        elevation: 3,
    },
    // Öneri kartındaki küçük poster görseli
    recImage: {
        width: 100,
        height: "100%",
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    // Öneri kartındaki içerik (başlık, skor, özet)
    recContent: {
        flex: 1,
        padding: 12,
        justifyContent: "flex-start",
    },
    // Öneri film başlığı
    recTitle: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 6,
    },
    // Öneri uyumluluk skoru (Yeşil renk)
    recScore: {
        color: "#46d369",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 8,
    },
    // Öneri film özeti
    recOverview: {
        color: "#b3b3b3",
        fontSize: 12,
        lineHeight: 16, // Okunabilirliği artırmak için satır yüksekliği
    },
});