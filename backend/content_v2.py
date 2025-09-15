import ast
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from db_helper import get_movies_df, get_ratings_df

class ContentBasedRecommenderV2:
    """Film içeriğine göre item ve kullanıcı profili çıkarır."""

    def __init__(self):
        print(">> Content verisi veritabanından okunuyor...")
        
        # 1. Ratings verisini çek
        self.ratings_df = get_ratings_df()
        self.ratings_df["userId"] = self.ratings_df["userId"].astype(str)
        self.ratings_df["movieId"] = self.ratings_df["movieId"].astype(str)
        # Timestamp veritabanında yoksa veya gerekliyse kontrol edilmeli. 
        # Veritabanı şemasında timestamp yoksa, recency (yenilik) hesabı yapılamaz.
        # Hata almamak için dummy timestamp ekliyoruz eğer yoksa:
        if "timestamp" not in self.ratings_df.columns:
             self.ratings_df["timestamp"] = 0

        # 2. Movies verisini çek (Item profilleri için)
        movies_df = get_movies_df().reset_index()
        movies_df["movieId"] = movies_df["movieId"].astype(str)
        
        # Gerekli sütunları al
        req_cols = ["movieId", "title", "genres", "overview", "keywords", "actors", "director"]
        # Tabloda olmayan sütunları boş string ile doldur (Hata önleyici)
        for col in req_cols:
            if col not in movies_df.columns:
                movies_df[col] = ""

        self.items_df = movies_df[req_cols].fillna("")

        self._build_item_profiles()
        print(">> Content model hazır.")

    @staticmethod
    def _split_pipe(x: str):
        return x.split("|") if isinstance(x, str) and x.strip() else []

    @staticmethod
    def _clean_keywords(x: str):
        if not isinstance(x, str) or not x.strip():
            return []
        try:
            # Veritabanında keywords temiz gelmiş olabilir veya JSON formatında kalmış olabilir
            if x.startswith("[") and "name" in x:
                items = ast.literal_eval(x)
                return [d.get("name", "") for d in items if isinstance(d, dict) and d.get("name")]
            else:
                return x.split(",") # Basit virgülle ayrılmışsa
        except Exception:
            return []

    def _build_item_profiles(self):
        items = self.items_df.copy()
        items["genres_list"] = items["genres"].apply(self._split_pipe)
        items["keywords_list"] = items["keywords"].apply(self._clean_keywords)
        items["cast_list"] = items["actors"].apply(
            lambda x: x.split(", ") if isinstance(x, str) and x.strip() else []
        )

        def join(prefix, lst):
            return " ".join(f"{prefix}_{str(t).replace(' ', '_')}" for t in lst)

        combined = (
            items["title"].astype(str) + " " +
            items["overview"].astype(str) + " " +
            items["genres_list"].apply(lambda l: join("genre", l)) + " " +
            items["keywords_list"].apply(lambda l: join("kw", l)) + " " +
            items["cast_list"].apply(lambda l: join("cast", l)) + " " +
            items["director"].apply(
                lambda d: f"dir_{str(d).replace(' ', '_')}"
            )
        )

        items["combined_text"] = combined
        self.items_df = items

        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=20000,
            ngram_range=(1, 2),
            min_df=2
        )
        self.item_matrix = self.vectorizer.fit_transform(
            self.items_df["combined_text"]
        )

        self.movieid_to_idx = {
            mid: i for i, mid in enumerate(self.items_df["movieId"])
        }
        self.idx_to_movieid = {i: mid for mid, i in self.movieid_to_idx.items()}
        
    def build_user_profile(self, user_id: str, rating_threshold: float = 3.5, use_recency: bool = True):
        # (Bu kısım aynı kalıyor, self.ratings_df zaten yukarıda DB'den doldu)
        df_r = self.ratings_df
        user_hist = df_r[df_r["userId"] == str(user_id)]
        if user_hist.empty:
            return None, None, None

        liked = user_hist[user_hist["rating"] >= rating_threshold]
        if liked.empty:
            return None, None, None

        liked_agg = (
            liked.groupby("movieId")
            .agg({"rating": "mean", "timestamp": "max"})
            .reset_index()
        )
        liked_agg = liked_agg[liked_agg["movieId"].isin(self.movieid_to_idx)]
        if liked_agg.empty:
            return None, None, None

        liked_indices = [self.movieid_to_idx[mid] for mid in liked_agg["movieId"]]
        liked_vectors = self.item_matrix[liked_indices]
        ratings = liked_agg["rating"].to_numpy(float)

        # Eğer timestamp hep 0 ise (veritabanında yoksa), recency etkisiz olsun
        if use_recency and liked_agg["timestamp"].sum() > 0:
            ts = liked_agg["timestamp"].to_numpy(float)
            ts_norm = (ts - ts.min()) / (ts.max() - ts.min() + 1e-8)
            weights = ratings * (0.5 + 0.5 * ts_norm)
        else:
            weights = ratings

        weights = weights / (weights.sum() + 1e-8)
        user_vec = np.average(liked_vectors.toarray(), axis=0, weights=weights)
        user_vec = user_vec.reshape(1, -1)

        watched_ids = set(user_hist["movieId"].unique())
        return user_vec, liked_indices, watched_ids