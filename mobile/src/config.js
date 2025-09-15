import { Platform, Dimensions } from "react-native";

// =========================
// EKRAN VE CİHAZ AYARLARI
// =========================

// Cihazın ekran genişliği ve yüksekliğini alır
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Ekran genişliğine göre mobil veya tablet/masaüstü ayrımı yapar (768px altı mobil sayılır)
export const IS_MOBILE = SCREEN_WIDTH <= 768;

// =========================
// SUNUCU VE AĞ AYARLARI
// =========================

// Backend sunucusunun yerel ağ üzerindeki IPv4 adresi
// Not: Bu adres her ağ değişiminde veya bilgisayar yeniden başlatıldığında değişebilir (ipconfig ile kontrol edin)
const SERVER_IP = "10.145.87.226";

// Android Emülatör için özel localhost adresi (Emülatörden bilgisayara erişim)
const ANDROID_EMULATOR_URL = "http://10.0.2.2:8000";

// Gerçek Android cihazdan bilgisayardaki sunucuya erişim adresi
const ANDROID_DEVICE_URL = `http://${SERVER_IP}:8000`;

// Platforma göre doğru API temel adresini seçer
// Android: Gerçek cihaz veya emülatör ayarına göre (şu an gerçek cihaz ayarlı)
// iOS/Default: Localhost
export const API_BASE_URL = Platform.select({
    android: ANDROID_DEVICE_URL, // Gerçek cihaz testi için ayarlanmış
    ios: "http://localhost:8000",
    default: "http://localhost:8000",
});

// =========================
// API UÇ NOKTALARI (ENDPOINTS)
// =========================

// Anket için rastgele film listesi getiren uç nokta
export const SURVEY_MOVIES = (base) => `${base}/survey-movies?n=100`;

// Kullanıcının daha önce anketi çözüp çözmediğini kontrol eden uç nokta
export const CHECK_USER = (base) => `${base}/check-user`;

// Kullanıcının verdiği puanlara göre öneri getiren uç nokta
export const RECOMMEND = (base) => `${base}/recommend-from-ratings`;

// Kayıtlı kullanıcı için öneri getiren uç nokta
export const RECOMMEND_USER = (base) => `${base}/recommend-user`;

// Kullanıcı giriş (login) uç noktası
export const LOGIN = (base) => `${base}/login`;

// Kullanıcı kayıt (register) uç noktası
export const REGISTER = (base) => `${base}/register`;

// =========================
// TMDB (THE MOVIE DATABASE) AYARLARI
// =========================

// TMDB API anahtarı (Film verilerini çekmek için gerekli)
export const TMDB_API_KEY = "4723bf39d9cdfc4dd14657865c2a92b8";

// Film arama işlemi için kullanılan TMDB API adresi
export const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie";

// Film posterlerini göstermek için kullanılan temel resim sunucusu adresi (w500 genişliğinde)
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
