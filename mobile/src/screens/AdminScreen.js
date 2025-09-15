import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ===================================
// YARDIMCI BİLEŞEN: ÇUBUK GRAFİK (BAR CHART)
// ===================================
// Verilen veriyi basit bir çubuk grafik olarak görselleştirir.
const BarChart = ({ data }) => {
    if (!data) return null;

    // Maksimum değeri bul (grafik ölçekleme için)
    const maxVal = Math.max(data.svd, data.content, data.hybrid, 0.01);

    // Tek bir çubuğu (bar) çizen alt bileşen
    const Bar = ({ label, value, color }) => {
        const widthPercentage = (value / maxVal) * 100;
        return (
            <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>{label}</Text>
                    <Text style={{ color: "#ccc" }}>%{(value * 100).toFixed(1)}</Text>
                </View>
                {/* Arka plan çubuğu */}
                <View style={{ height: 20, width: "100%", backgroundColor: "#333", borderRadius: 4 }}>
                    {/* Doluluk oranı (Renkli kısım) */}
                    <View
                        style={{
                            height: "100%",
                            width: `${widthPercentage}%`,
                            backgroundColor: color,
                            borderRadius: 4,
                        }}
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Recall@20 Başarısı</Text>
            {/* Üç farklı modelin başarısını göster */}
            <Bar label="SVD (İşbirlikçi)" value={data.svd} color="#4A90E2" />
            <Bar label="Content (İçerik)" value={data.content} color="#50E3C2" />
            <Bar label="Hybrid (Karışım)" value={data.hybrid} color="#E50914" />
            <Text style={styles.infoText}>
                * Bu grafik, test verisindeki kullanıcıların gerçek beğenilerini tahmin etme başarısını gösterir.
            </Text>
        </View>
    );
};

// ===================================
// ADMİN PANELİ EKRANI
// ===================================
export default function AdminScreen({ navigation, route }) {
    const { apiBase } = route.params || {};
    const [activeTab, setActiveTab] = useState("analytics"); // Aktif sekme: 'analytics' veya 'inspector'

    // --- ANALİTİK SEKMESİ STATE'LERİ ---
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // --- İNCELEME (INSPECTOR) SEKMESİ STATE'LERİ ---
    const [inspectUserId, setInspectUserId] = useState("1"); // Varsayılan incelenecek user ID
    const [inspectData, setInspectData] = useState(null);
    const [loadingInspect, setLoadingInspect] = useState(false);

    // --- ANALİZ VERİLERİNİ ÇEK ---
    // Backend'deki modelleri test eder ve sonuçları getirir
    const fetchAnalytics = async () => {
        try {
            setLoadingAnalytics(true);
            const res = await fetch(`${apiBase}/admin/analytics`);
            const json = await res.json();
            if (json.success) {
                setAnalyticsData(json.results);
            } else {
                Alert.alert("Hata", "Analiz verisi alınamadı: " + json.error);
            }
        } catch (e) {
            Alert.alert("Hata", "Bağlantı hatası: " + e.message);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    // --- KULLANICI İNCELEME VERİLERİNİ ÇEK ---
    // Belirli bir kullanıcı için detaylı öneri analizi yapar
    const fetchInspection = async () => {
        if (!inspectUserId) return;
        try {
            setLoadingInspect(true);
            // Verilen user_id için öneri nedenlerini ve skorlarını getirir
            const res = await fetch(`${apiBase}/admin/inspect-user?user_id=${inspectUserId}`);
            const json = await res.json();
            if (json.success) {
                setInspectData(json.recommendations);
            } else {
                Alert.alert("Hata", json.error || "Veri alınamadı.");
            }
        } catch (e) {
            Alert.alert("Hata", "Bağlantı hatası: " + e.message);
        } finally {
            setLoadingInspect(false);
        }
    };

    // İlk açılışta veya sekme değişiminde eğer analiz verisi yoksa çek
    useEffect(() => {
        if (activeTab === "analytics" && !analyticsData) {
            fetchAnalytics();
        }
    }, [activeTab]);

    return (
        <SafeAreaView style={styles.container}>
            {/* ÜST SEKMELER (TABS) */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "analytics" && styles.activeTab]}
                    onPress={() => setActiveTab("analytics")}
                >
                    <Text style={[styles.tabText, activeTab === "analytics" && styles.activeTabText]}>
                        Genel Analiz
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "inspector" && styles.activeTab]}
                    onPress={() => setActiveTab("inspector")}
                >
                    <Text style={[styles.tabText, activeTab === "inspector" && styles.activeTabText]}>
                        Canlı İncele
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* --- ANALİTİK GÖRÜNÜMÜ --- */}
                {activeTab === "analytics" && (
                    <View>
                        <Text style={styles.sectionTitle}>Sistem Performansı</Text>

                        {loadingAnalytics ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color="#E50914" />
                                <Text style={styles.loadingText}>Modeller Test Ediliyor... Lütfen bekleyin.</Text>
                                <Text style={styles.loadingSubText}>(Bu işlem test veri setinin boyutuna göre zaman alabilir)</Text>
                            </View>
                        ) : (
                            <>
                                {analyticsData ? (
                                    <BarChart data={analyticsData} />
                                ) : (
                                    <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>Veri yok.</Text>
                                )}

                                <TouchableOpacity style={styles.refreshButton} onPress={fetchAnalytics}>
                                    <Text style={styles.refreshButtonText}>Analizi Tekrar Çalıştır 🔄</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* --- İNCELEME (INSPECTOR) GÖRÜNÜMÜ --- */}
                {activeTab === "inspector" && (
                    <View>
                        <Text style={styles.sectionTitle}>Kullanıcı Öneri Detayları</Text>

                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="User ID (örn: 1)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={inspectUserId}
                                onChangeText={setInspectUserId}
                            />
                            <TouchableOpacity style={styles.goButton} onPress={fetchInspection}>
                                <Text style={styles.goButtonText}>Getir</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingInspect && <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 20 }} />}

                        {!loadingInspect && inspectData && (
                            <View style={{ marginTop: 10 }}>
                                {inspectData.map((item, idx) => (
                                    <View key={idx} style={styles.inspectCard}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.movieTitle}>{idx + 1}. {item.title}</Text>
                                            <Text style={styles.finalScore}>Skor: {item.final_score.toFixed(4)}</Text>
                                        </View>
                                        <Text style={styles.genres}>{item.genres}</Text>

                                        {/* Detaylı Skorlar */}
                                        <View style={styles.scoreRow}>
                                            <Text style={{ color: '#4A90E2' }}>SVD: {item.details.svd.toFixed(4)}</Text>
                                            <Text style={{ color: '#50E3C2' }}>Cont: {item.details.content.toFixed(4)}</Text>
                                            <Text style={{ color: '#E67E22' }}>Pop: {item.details.popularity.toFixed(4)}</Text>
                                        </View>

                                        {/* Kullanılan Ağırlıklar ve Kaynak */}
                                        <View style={styles.weightsRow}>
                                            <Text style={styles.weightText}>
                                                Ağırlıklar: α={item.details.weights.alpha}, β={item.details.weights.beta}, γ={item.details.weights.gamma}
                                            </Text>
                                            <Text style={styles.sourceText}>CF Kaynak: {item.details.cf_source}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

// Stiller
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    tabContainer: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: "center",
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: "#E50914",
    },
    tabText: {
        color: "#666",
        fontSize: 16,
        fontWeight: "600",
    },
    activeTabText: {
        color: "#fff",
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 15,
    },
    chartContainer: {
        backgroundColor: "#111",
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#333",
        marginBottom: 20,
    },
    chartTitle: {
        color: "#fff",
        fontSize: 16,
        marginBottom: 15,
        textAlign: 'center',
    },
    infoText: {
        color: "#666",
        fontSize: 12,
        marginTop: 10,
        fontStyle: 'italic',
    },
    loadingBox: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: "#fff",
        marginTop: 15,
        fontSize: 16,
    },
    loadingSubText: {
        color: "#666",
        marginTop: 5,
        fontSize: 12,
    },
    refreshButton: {
        backgroundColor: "#222",
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#444",
    },
    refreshButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        backgroundColor: "#111",
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 4,
        padding: 10,
        color: "#fff",
        marginRight: 10,
    },
    goButton: {
        backgroundColor: "#E50914",
        paddingHorizontal: 20,
        justifyContent: 'center',
        borderRadius: 4,
    },
    goButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    inspectCard: {
        backgroundColor: "#111",
        padding: 12,
        marginBottom: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#222",
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    movieTitle: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 15,
        flex: 1,
    },
    finalScore: {
        color: "#E50914",
        fontWeight: "bold",
    },
    genres: {
        color: "#666",
        fontSize: 12,
        marginTop: 2,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#222",
        paddingTop: 8,
    },
    weightsRow: {
        marginTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    weightText: {
        color: '#444',
        fontSize: 10
    },
    sourceText: {
        color: '#444',
        fontSize: 10,
        fontStyle: 'italic'
    }
});
