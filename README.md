# Film Öneri Sistemi - Proje Anlatım Rehberi

Bu belge, geliştirdiğimiz film öneri sisteminin nasıl çalıştığını, teknik detaylarını ve kullanıcı akışını, projeyi hiç bilmeyen birine anlatmak için hazırlanmıştır. Sunum sırasında gelebilecek sorular için de "Soru-Cevap" bölümü eklenmiştir.

---

## 1. Projenin Amacı Nedir?

Bu proje, kullanıcılara kişiselleştirilmiş film önerileri sunan, **hibrit (karma) yapay zeka** tabanlı bir mobil uygulamadır. Kullanıcıların geçmiş beğenilerini ve filmlerin içerik özelliklerini (tür, oyuncular, yönetmen vb.) analiz eder, böylece her kullanıcıya özel, nokta atışı öneriler yapar.

**Kısa Özet:** "Netflix veya Spotify gibi platformların arkasında çalışan öneri sisteminin, kendi veri setimiz ve algoritmalarımızla geliştirilmiş hali."

---

## 2. Sistem Nasıl Çalışıyor? (Genel Mimari)

Proje iki ana parçadan oluşur:
1.  **Mobil Uygulama (Ön Yüz / Frontend):** Kullanıcının gördüğü, tuşlara bastığı, filmleri kaydırıp beğendiği ekranlar. (React Native ile yazıldı).
2.  **Yapay Zeka Sunucusu (Arka Plan / Backend):** Uygulamadan gelen emirleri alan, hesaplamaları yapan ve öneri listesini üreten beyin. (Python ve FastAPI ile yazıldı).

### Akış Şeması:
`Kullanıcı (Mobil)` -> `İnternet` -> `Sunucu (API)` -> `Yapay Zeka Modelleri` -> `Veritabanı`

---

## 3. Kullanıcı Akışı (User Journey)

Bir kullanıcı uygulamayı açtığında neler olur?

1.  **Giriş/Kayıt:** Kullanıcı sisteme güvenli bir şekilde giriş yapar. Bu sayede öneriler kişiye özel saklanır.
2.  **Soğuk Başlangıç (Cold Start) Çözümü - Anket:**
    *   Sistem, yeni gelen kullanıcıyı hiç tanımaz. Onu tanımak için "Film Anketi" ekranını açar.
    *   Tinder benzeri bir arayüzle kullanıcı filmleri sağa (beğendim), sola (beğenmedim) veya aşağı (izlemedim) atar.
    *   Bu veriler anlık olarak sunucuya gönderilir.
3.  **Önerilerin Üretilmesi:**
    *   Sunucu, anketteki cevapları alır. Yapay zeka modellerini çalıştırır.
    *   Binlerce film arasından kullanıcıya en uygun 10 filmi seçer.
4.  **Ana Sayfa ve Etkileşim:**
    *   Kullanıcı ana sayfada bu önerileri görür.
    *   Bir filmi izlediyse veya beğenmediyse listeden çıkartabilir. Sistem bu hareketi de "geri bildirim" olarak kaydeder ve bir sonraki önerisini buna göre düzeltir.

---

## 4. Teknik Detaylar ve Yapay Zeka

Birisi "Peki arkada nasıl bir zeka var?" derse anlatılacak kısım burasıdır. Sistemimiz **"Hibrit Öneri Modeli"** kullanır. Bu, iki farklı teknolojinin güçlerini birleştirir:

### A. İşbirlikçi Filtreleme (SVD - Collaborative Filtering)
*   **Mantığı:** "Sen A filmini beğendin. Senin gibi A filmini beğenen diğer insanlar B filmini de beğenmiş. O zaman sen de B filmini beğenebilirsin."
*   **Nasıl Çalışır:** Kullanıcıların ortak zevklerini matematiksel matrisler üzerinden bulur.
*   **Avantajı:** Hiç bilmediğiniz ama zevkinize uygun sürpriz filmleri keşfetmenizi sağlar.

### B. İçerik Tabanlı Filtreleme (Content-Based Filtering)
*   **Mantığı:** "Sen 'Yüzüklerin Efendisi'ni beğendin. Bu film 'Fantastik' türünde ve yönetmeni Peter Jackson. O zaman sana diğer 'Fantastik' veya Peter Jackson filmlerini önereyim."
*   **Nasıl Çalışır:** Filmlerin açıklamalarını, türlerini ve kadrosunu analiz eder.
*   **Avantajı:** Yeni çıkan veya az kişinin izlediği filmleri bile özelliklerine bakarak önerebilir.

### C. Hibrit Model
*   Biz bu iki sistemin skorlarını birleştiriyoruz. Hem topluluğun zevkini hem de filmin içeriğini hesaba katıyoruz.
*   **Formülümüz:** `Genel Skor = (SVD Skoru * Ağırlık) + (İçerik Skoru * Ağırlık) + (Popülerlik)`

---

## 5. Gelebilecek Sorular ve Cevapları

**Soru 1: Neden tek bir yöntem (mesela sadece içerik) kullanmadınız?**
**Cevap:** Sadece içeriğe baksaydık, sistem size sürekli aynı tarz filmleri önerirdi (Hep aksiyon, hep aksiyon...). Sadece kullanıcı benzerliğine baksaydık, yeni çıkan bir filmi kimse izlemediği için sistem o filmi öneremezdi. Hibrit yapı, bu iki sorunu da çözüyor; hem çeşitlilik sunuyor hem de yeni filmleri yakalıyor.

**Soru 2: Backend'de hangi teknolojiler var?**
**Cevap:**
*   **Dil:** Python (Veri bilimi için en iyisi).
*   **Framework:** FastAPI (Hızlı ve modern bir web çatısı).
*   **Veritabanı:** SQLite (Kullanıcı ve puan verilerini tutmak için).
*   **Veri İşleme:** Pandas ve Scikit-learn kütüphaneleri.

**Soru 3: Yeni bir kullanıcı geldiğinde sistem nasıl çalışıyor?**
**Cevap:** Buna "Soğuk Başlangıç Problemi" denir. Biz bunu "Survey (Anket)" ekranıyla çözüyoruz. Kullanıcıdan ilk başta rastgele seçilmiş popüler filmleri oylamasını istiyoruz. Böylece elimizde analiz edecek bir "çekirdek veri" oluşuyor.

**Soru 4: Admin Paneli ne işe yarıyor?**
**Cevap:** Admin paneli, sistemin sağlığını kontrol ettiğimiz yerdir.
*   **Genel Analiz:** Yapay zeka modellerinin başarı oranlarını (doğruluk payını) grafiklerle görürüz.
*   **Inspector (Canlı İnceleme):** Bir kullanıcının ID'sini girip, sistemin ona NEDEN o filmi önerdiğini (SVD puanı kaç, İçerik puanı kaç?) detaylıca inceleyebiliriz.

**Soru 5: Bu proje gerçek hayatta ölçeklenebilir mi? **
**Cevap:** Şu anki yapımız prototip aşamasında yerel dosyalar (CSV) ve hafif veritabanı (SQLite) kullanıyor. 1 milyon kullanıcı için veritabanını PostgreSQL gibi daha güçlü bir sisteme, yapay zeka modellerini de anlık hesaplama yerine önceden hesaplanmış (pre-computed) bir yapıya (örneğin Redis önbelleği) geçirmemiz gerekir. Mimari buna uygundur.

---

## 6. Projenin Dosya Yapısı 

*   **`src/screens` (Mobil):** Uygulamanın sayfaları (Giriş, Anket, Anasayfa).
*   **`api.py` (Sunucu):** İstekleri karşılayan kapı.
*   **`hibrit.py` (Yapay Zeka):** Öneri motorunun beyni.
*   **`data_loader.py`:** Veri setini okuyan ve hazırlayan modül.
