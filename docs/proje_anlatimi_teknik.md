# Film Öneri Sistemi - Detaylı Teknik Dokümantasyon

Bu doküman, geliştirilen hibrit film öneri sisteminin teknik mimarisini, kullanılan algoritmaları, veri akışını ve teknoloji yığınını derinlemesine açıklar.

---

## 1. Teknoloji Yığını (Tech Stack)

Proje, modern ve yüksek performanslı kütüphaneler üzerine inşa edilmiştir.

### 🐍 Backend (Sunucu & Yapay Zeka)
*   **Dil:** Python 3.9+ (Veri bilimi ekosistemi için standart)
*   **Web Framework:** **FastAPI** (Yüksek performanslı, asenkron, otomatik Swagger dokümantasyonu sunan modern REST API çatısı)
*   **Sunucu Motoru:** **Uvicorn** (ASGI sunucusu, çoklu istekleri asenkron işlemek için)
*   **Veri İşleme:** **Pandas** & **NumPy** (Vektörel hesaplamalar ve dataframe manipülasyonu)
*   **Makine Öğrenimi (ML):**
    *   **Scikit-Learn:** TF-IDF vektörleştirme ve Cosine Similarity (Benzerlik) hesapları için.
    *   **SciPy:** Seyrek matris işlemleri ve SVD (Singular Value Decomposition) lineer cebir hesapları için.
*   **Veritabanı Katmanı:** **SQLAlchemy** (ORM) & **SQLite** (Hafif, dosya tabanlı ilişkisel veritabanı).

### 📱 Frontend (Mobil Uygulama)
*   **Framework:** **React Native (Expo)** (Cross-platform mobil geliştirme)
*   **Dil:** JavaScript (ES6+) / React
*   **Navigasyon:** React Navigation (Stack yapısı)
*   **HTTP İstekleri:** Fetch API (Timeout ve hata yönetimi ile güçlendirilmiş `fetchWithTimeout` utility fonksiyonu)

---

## 2. Sistem Mimarisi ve Veri Akışı

Mobil uygulama ve Backend sunucusu **RESTful API** prensiplerine göre JSON formatında haberleşir.

### İletişim Şeması
1.  **Mobil:** Kullanıcı bir eylem yapar (Örn: Anketi bitirir).
2.  **Request:** Uygulama, veriyi JSON paketine çevirir (`ratings: [{movieId: 120, rating: 4.0}, ...]`) ve API'ye `POST` isteği atar.
3.  **Backend:** FastAPI isteği karşılar, Pydantic modelleri ile veriyi doğrular (Validation).
4.  **İşlem:** Hibrit öneri motoru çalışır, matematiksel hesaplamaları yapar.
5.  **Veritabanı:** Gerekli veriler (yeni puanlar, kullanıcı kaydı) SQLite veritabanına işlenir.
6.  **Response:** Hesaplanan öneri listesi JSON olarak mobile döner.
7.  **Mobil:** Liste parse edilir ve ekranda film kartları olarak gösterilir.

---

## 3. Yapay Zeka Algoritmaları (Derinlemesine Bakış)

Sistemimiz **Hibrit (Karma)** bir yapı kullanır. Bu yapı, 3 farklı skoru ağırlıklı olarak birleştirir.

### A. İşbirlikçi Filtreleme (Collaborative Filtering - SVD)
Bu modül `cf_svd.py` dosyasında çalışır.
*   **Teknik:** Matrix Factorization (Matris Ayrıştırma) yöntemi olan **SVD (Singular Value Decomposition)** kullanılır.
*   **Kütüphane:** `scipy.sparse.linalg.svds`
*   **Nasıl Çalışır?**
    1.  Kullanıcı-Film matrisi (User-Item Matrix) oluşturulur.
    2.  Boş değerler (izlenmeyen filmler) kullanıcının ortalaması ile doldurulur (Imputation).
    3.  Matris `U`, `Sigma`, `Vt` olarak 3 parçaya ayrılır.
    4.  Bu matrislerin çarpımı ile boş hücreler tahmin edilir (Latent Factor Reconstruction).
*   **Amacı:** Kullanıcıların gizli zevk kalıplarını (Latent Patterns) bularak, hiç bilmedikleri ama sevecekleri filmleri keşfetmek.

### B. İçerik Tabanlı Filtreleme (Content-Based Filtering)
Bu modül `content_v2.py` dosyasında çalışır.
*   **Teknik:** **TF-IDF (Term Frequency-Inverse Document Frequency)** ve **Cosine Similarity**.
*   **Veri Hazırlığı:** Her film için zengin bir metin profili oluşturulur:
    *   `Başlık` + `Özet` + `Türler` + `Anahtar Kelimeler` + `Oyuncular` + `Yönetmen`
*   **Vektörleştirme:** `TfidfVectorizer` bu metinleri sayısal vektörlere çevirir (20.000 boyutlu uzay).
*   **Kullanıcı Profili:** Kullanıcının beğendiği filmlerin vektörlerinin ağırlıklı ortalaması alınarak bir "Kullanıcı Vektörü" oluşturulur.
*   **Hesaplama:** Kullanıcı vektörü ile tüm film vektörleri arasındaki Cosine (Açısal) Benzerlik hesaplanır.
*   **Amacı:** "Yüzüklerin Efendisi"ni seven birine, benzer kelimelere ve türe sahip "Hobbit"i önermek. Soğuk başlangıç (Cold Start) sorununu çözer.

### C. Hibrit Füzyon (Skor Birleştirme)
Bu modül `hibrit.py` dosyasında çalışır.
*   Üç bileşen birleştirilir:
    1.  **SVD Skoru** (Normalize edilmiş, 0-1 arası)
    2.  **Content Skoru** (Cosine Similarity, 0-1 arası)
    3.  **Popülerlik Skoru** (Logaritmik vote_count ve vote_average kombinasyonu)
*   **Dinamik Ağırlıklandırma:**
    *   **Yeni Kullanıcı (Cold User):** Henüz yeterli verisi yoksa, SVD güvenilir değildir. Bu yüzden **Content (%60)** ve **Popülerlik (%20)** ağırlığı artırılır.
    *   **Eski Kullanıcı (Warm User):** Verisi çoksa, **SVD (%50-60)** ağırlığı artırılır çünkü zevk haritası oturmuştur.

---

## 4. Anket (Survey) Mantığı ve Veri Akışı

Kullanıcı uygulamaya ilk girdiğinde sistem onu tanımaz. Bu yüzden **SurveyScreen.js** devreye girer.

1.  **Filmlerin Seçimi (`/survey-movies`):**
    *   API, popülerlik skoruna göre en yüksek filmlerden bir havuz oluşturur.
    *   Bu havuzdan rastgele, çeşitliliği yüksek bir set (örneğin 20 film) seçilip kullanıcıya gönderilir.
    *   *Sebep:* Kullanıcının bildiği filmler gelmeli ki "Beğendim/Beğenmedim" diyebilsin. Bilmediği sanat filmlerini sormak verimsizdir.

2.  **Etkileşim (Swipe):**
    *   Kullanıcı sağa (Like -> 4.0 puan), sola (Dislike -> 2.0 puan) veya aşağı (Skip -> Nötr) atar.
    *   Bu veriler `liked`, `disliked` dizilerinde mobil hafızada birikir.

3.  **Gönderim (`/recommend-from-ratings`):**
    *   "Önerileri Göster" butonuna basıldığında bu diziler tek bir paket yapılır.
    *   Paket: `{"ratings": [{"movieId": 1, "rating": 4.0}, ...], "user_id": 123}`

4.  **Anlık Eğitim (Online Learning - Simüle):**
    *   Sistem bu yeni puanları alır almaz, bunları geçici olarak Content modelindeki kullanıcı profiline ekler.
    *   SVD hemen güncellenemez (maliyetli olduğu için), bu yüzden anlık öneride Content ve Popülerlik baskın çalışır.
    *   Sonuç olarak kullanıcı saniyeler içinde anketine uygun önerileri görür.

---

## 5. Backend API Dokümanı (Özet)

| Method | Endpoint | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/survey-movies` | Anket için popüler filmleri döndürür. |
| `POST` | `/recommend-from-ratings` | Anket sonuçlarını alır, kaydeder ve anlık öneri üretir. |
| `GET` | `/recommend-user` | Giriş yapmış kullanıcılar için kişisel öneri üretir. |
| `GET` | `/admin/analytics` | Modellerin başarı oranlarını (Recall@K) test eder. |
| `GET` | `/admin/inspect-user` | Bir kullanıcıya neden o önerinin yapıldığını (skor kırılımlarını) açıklar. |
