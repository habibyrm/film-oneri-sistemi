import { TMDB_SEARCH_URL, TMDB_API_KEY } from "./config";

// Farklı kaynaklardan gelen film objelerinden ID'yi güvenli bir şekilde çeker.
// Bazı API'lerde `movieId`, bazılarında `movie_id` veya sadece `id` olabilir.
export const getMovieIdFromObj = (m) => {
    if (!m) return null;
    return m.movieId ?? m.movie_id ?? m.id ?? null;
};

// Bir diziden rastgele belirtilen sayıda eleman seçer (Fisher-Yates algoritması benzeri bir yaklaşımla karıştırır).
// Orijinal diziyi değiştirmez, kopyası üzerinde çalışır.
export const getRandomSample = (arr, sampleSize) => {
    if (!Array.isArray(arr)) return [];
    const copy = [...arr];
    const size = Math.min(sampleSize, copy.length);
    // Diziyi karıştır
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    // İlk 'n' elemanı döndür
    return copy.slice(0, size);
};

// Belirli bir süre sonra zaman aşımına uğrayan fetch (istek) fonksiyonu.
// Eğer sunucu belirtilen sürede (varsayılan 8sn) cevap vermezse isteği iptal eder.
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        // İşlem bittiğinde veya hata aldığında zamanlayıcıyı temizle
        clearTimeout(id);
    }
};

// Film listesindeki eksik poster veya özet bilgilerini TMDB API kullanarak tamamlar.
// Özellikle sadece başlığı olan filmler için görsel bulmakta kullanılır.
export const enrichWithTMDB = async (list) => {
    return await Promise.all(
        (list || []).map(async (movie) => {
            // Eğer poster ve özet zaten varsa, API çağrısı yapmadan olduğu gibi döndür
            if (movie?.poster_path && movie?.overview) return movie;

            try {
                const title = movie?.title ?? "";
                if (!title) return movie;

                // TMDB üzerinde film başlığı ile arama yap (Türkçe dil desteği ile)
                const searchUrl = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
                    title
                )}&language=tr-TR`;

                // 6 saniye timeout ile istek at
                const tmdbRes = await fetchWithTimeout(searchUrl, {}, 6000);
                const tmdbJson = await tmdbRes.json();
                const first = tmdbJson?.results?.[0]; // İlk sonucu al

                // Mevcut bilgileri koru, eksikleri TMDB'den tamamla
                return {
                    ...movie,
                    poster_path: movie?.poster_path ?? first?.poster_path ?? null,
                    overview:
                        movie?.overview ??
                        first?.overview ??
                        "Detay yok.",
                    release_date: movie?.release_date ?? first?.release_date ?? "",
                };
            } catch {
                // Hata durumunda (internet yoksa vb.) orijinal objeyi bozmadan döndür
                return movie;
            }
        })
    );
};