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
import { REGISTER } from "../config";
import { styles } from "../theme";

// Kullanıcı kayıt ekranı bileşeni
// Props:
// - navigation: Sayfalar arası geçişi sağlar
// - apiBase: Kullanılacak API'nin temel adresi
export default function RegisterScreen({ navigation, apiBase }) {
    // Yerel state tanımları
    const [username, setUsername] = useState("");  // Kullanıcı adı girişi
    const [password, setPassword] = useState("");  // Şifre girişi
    const [loading, setLoading] = useState(false); // Yükleme durumu
    const [error, setError] = useState(null);      // Hata mesajı

    // Kayıt olma butonuna basıldığında çalışacak fonksiyon
    const handleRegister = async () => {
        setError(null); // Önceki hataları temizle

        // Boş alan kontrolü
        if (!username.trim() || !password.trim()) {
            setError("Kullanıcı adı ve şifre gereklidir.");
            return;
        }

        try {
            setLoading(true); // Yüklemeyi başlat
            const url = REGISTER(apiBase); // Register API adresini getir

            // Backend'e POST isteği gönder (Yeni kullanıcı oluştur)
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password: password.trim() }),
            });

            const json = await res.json();

            // Kayıt başarılı mı kontrol et
            if (json.success) {
                // Başarılı ise kullanıcıya bilgi ver ve giriş ekranına yönlendir
                alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
                navigation.goBack(); // Login ekranına dön
            } else {
                // Başarısız ise hatayı göster
                setError(json.message || "Kayıt başarısız.");
            }
        } catch (e) {
            // Sunucu hatası veya bağlantı sorunu
            setError("Bağlantı hatası: " + e.message);
        } finally {
            // İşlem bittiğinde yükleme göstergesini kapat
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            {/* Durum çubuğunu açık renkli yap */}
            <StatusBar barStyle="light-content" />

            <View style={styles.loginContainer}>
                <Text style={styles.title}>Kayıt Ol</Text>

                {/* Kullanıcı Adı Girişi */}
                <TextInput
                    style={styles.input}
                    placeholder="Kullanıcı Adı"
                    placeholderTextColor="#777777"
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                />

                {/* Şifre Girişi */}
                <TextInput
                    style={[styles.input, { marginTop: 12 }]}
                    placeholder="Şifre"
                    placeholderTextColor="#777777"
                    secureTextEntry // Şifreyi gizle
                    value={password}
                    onChangeText={setPassword}
                />

                {/* Hata Mesajı Alanı */}
                {error && (
                    <Text style={[styles.subtitle, { color: "#ff6b6b", marginTop: 8 }]}>
                        {error}
                    </Text>
                )}

                {/* Kayıt Ol Butonu */}
                <TouchableOpacity
                    style={styles.redButton}
                    onPress={handleRegister}
                    disabled={loading} // Yüklenirken tıklanmayı engelle
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.redButtonText}>Kayıt Ol</Text>
                    )}
                </TouchableOpacity>

                {/* Giriş Yap'a Dön Butonu (Vazgeç) */}
                <TouchableOpacity
                    style={[styles.outlineButton, { marginTop: 16 }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.outlineButtonText}>Giriş Yap'a Dön</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
