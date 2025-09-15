import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { API_BASE_URL } from "./src/config";
import { DarkTheme } from "./src/theme";

// Ekranlar (Screens)
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import SurveyScreen from "./src/screens/SurveyScreen";
import AdminScreen from "./src/screens/AdminScreen";

const Stack = createNativeStackNavigator();

// Uygulamanın Ana Bileşeni
// Tüm navigasyon yapısı ve global kullanıcı durumu (oturum, yetki) burada yönetilir.
export default function App() {
  // --- GLOBAL STATE ---
  const [userId, setUserId] = useState(null);       // Giriş yapan kullanıcının ID'si
  const [username, setUsername] = useState(null);   // Kullanıcı adı (örn: Admin)
  const [loggedIn, setLoggedIn] = useState(false);  // Oturum durumu
  const [isAdmin, setIsAdmin] = useState(false);    // Admin yetkisi kontrolü

  // API bağlantı adresi (config dosyasından gelir)
  const apiBase = API_BASE_URL;

  // Çıkış (Logout) işlemi
  const handleLogout = () => {
    setUserId(null);
    setUsername(null);
    setLoggedIn(false);
    setIsAdmin(false);
  };

  return (
    <SafeAreaProvider>
      {/* Özel oluşturulan Koyu Tema (DarkTheme) kullanılır */}
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: "#000000" }, // Header arka planı siyah
            headerTintColor: "#ffffff",                  // Header yazı rengi beyaz
            headerTitleStyle: { fontWeight: "600" },     // Header başlık kalınlığı
            contentStyle: { backgroundColor: "#000000" },// Sayfa içerik arka planı siyah
          }}
        >
          {/* --- ANASAYFA --- */}
          <Stack.Screen name="Home" options={{ title: "Anasayfa" }}>
            {(props) => (
              <HomeScreen
                {...props}
                loggedIn={loggedIn}
                userId={userId}
                username={username}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                apiBase={apiBase}
              />
            )}
          </Stack.Screen>

          {/* --- GİRİŞ EKRANI --- */}
          <Stack.Screen name="Login" options={{ title: "Giriş" }}>
            {(props) => (
              <LoginScreen
                {...props}
                setUserId={setUserId}
                setUsername={setUsername}
                setLoggedIn={setLoggedIn}
                setIsAdmin={setIsAdmin}
                apiBase={apiBase}
              />
            )}
          </Stack.Screen>

          {/* --- KAYIT EKRANI --- */}
          <Stack.Screen name="Register" options={{ title: "Kayıt Ol" }}>
            {(props) => <RegisterScreen {...props} apiBase={apiBase} />}
          </Stack.Screen>

          {/* --- ANKET EKRANI --- */}
          <Stack.Screen name="Survey" options={{ title: "Anket" }}>
            {(props) => (
              <SurveyScreen
                {...props}
                userId={userId}
                loggedIn={loggedIn}
                apiBase={apiBase}
              />
            )}
          </Stack.Screen>

          {/* --- YÖNETİM PANELİ (Sadece Admin Erişebilir) --- */}
          <Stack.Screen name="Admin" options={{ title: "Yönetim Paneli" }}>
            {(props) => <AdminScreen {...props} />}
          </Stack.Screen>

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}