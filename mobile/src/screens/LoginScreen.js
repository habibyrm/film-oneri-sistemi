import React, { useState } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LOGIN } from "../config";
import { styles } from "../theme";

// Kullanıcı giriş ekranı bileşeni
// Props:
// - navigation: Sayfalar arası geçişi sağlar
// - setUserId: Giriş yapan kullanıcının ID'sini global state'e kaydeder
// - setUsername: Kullanıcı adını global state'e kaydeder
// - setLoggedIn: Giriş yapıldı bilgisini günceller
// - setIsAdmin: Kullanıcının admin olup olmadığını belirler
// - apiBase: Kullanılacak API'nin temel adresi
export default function LoginScreen({ navigation, setUserId, setUsername, setLoggedIn, setIsAdmin, apiBase }) {
    // Yerel state tanımları
    const [username, setLocalUsername] = useState(""); // Kullanıcı adı girişi
    const [password, setPassword] = useState("");      // Şifre girişi
    const [loading, setLoading] = useState(false);     // Yükleniyor durumu (Spinner için)
    const [error, setError] = useState(null);          // Hata mesajı

    // Giriş yap butonuna basıldığında çalışacak fonksiyon
    const handleLogin = async () => {
        setError(null); // Önceki hataları temizle

        // Boş alan kontrolü
        if (!username.trim() || !password.trim()) {
            setError("Lütfen kullanıcı adı ve şifre gir.");
            return;
        }

        try {
            setLoading(true); // Yüklemeyi başlat
            const url = LOGIN(apiBase); // Login API adresini al

            // Backend'e POST isteği gönder
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password: password }),
            });
            const json = await res.json();

            // Giriş başarılı mı kontrol et
            if (json?.success) {
                // Backend userId'yi int olarak döner, onu setUserId'ye ver
                setUserId(json.user_id);
                if (setUsername) setUsername(username.trim()); // Global kullanıcı adını ayarla

                setLoggedIn(true); // Giriş yapıldı olarak işaretle

                // Admin kontrolü (Basit kullanıcı adı kontrolü)
                // Gerçek bir uygulamada bu bilgi backend'den "role" olarak dönmelidir.
                if (username.trim().toLowerCase() === "admin") {
                    if (setUserId) setIsAdmin(true);
                } else {
                    if (setUserId) setIsAdmin(false);
                }

                // Ana sayfaya yönlendir (Geri tuşu ile tekrar login'e dönülmemesi için replace kullanılır)
                navigation.replace("Home");
            } else {
                // Backend'den gelen hata mesajını göster
                setError(json?.message || "Giriş başarısız.");
            }
        } catch (e) {
            // Ağ hatası veya sunucuya erişim sorunu
            console.log("❌ [Login] error:", e?.name, e?.message);
            setError("Sunucuya bağlanılamadı. IP/Port kontrol et.");
        } finally {
            // İşlem bittiğinde yükleme durumunu kapat
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            {/* Durum çubuğunu (saat, pil vb.) açık renkli yap */}
            <StatusBar barStyle="light-content" />

            <View style={styles.loginContainer}>
                <Text style={styles.title}>Giriş Yap</Text>

                {/* Kullanıcı Adı Girişi */}
                <TextInput
                    style={styles.input}
                    placeholder="Kullanıcı Adı"
                    placeholderTextColor="#777777"
                    autoCapitalize="none" // İlk harfi otomatik büyütmeyi kapat
                    value={username}
                    onChangeText={setLocalUsername}
                />

                {/* Şifre Girişi */}
                <TextInput
                    style={[styles.input, { marginTop: 12 }]}
                    placeholder="Şifre"
                    placeholderTextColor="#777777"
                    secureTextEntry // Şifreyi gizle (****)
                    value={password}
                    onChangeText={setPassword}
                />

                {/* Hata Mesajı Gösterimi */}
                {error && (
                    <Text style={[styles.subtitle, { color: "#ff6b6b", marginTop: 8 }]}>
                        {error}
                    </Text>
                )}

                {/* Giriş Yap Butonu */}
                <TouchableOpacity
                    style={styles.redButton}
                    onPress={handleLogin}
                    disabled={loading} // Yüklenirken tıklanmayı engelle
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.redButtonText}>Giriş Yap</Text>
                    )}
                </TouchableOpacity>

                {/* Kayıt Ol Sayfasına Yönlendirme Butonu */}
                <TouchableOpacity
                    style={[styles.outlineButton, { marginTop: 16 }]}
                    onPress={() => navigation.navigate("Register")}
                >
                    <Text style={styles.outlineButtonText}>Kayıt Ol</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}