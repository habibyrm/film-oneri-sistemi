import pandas as pd
from sklearn.model_selection import train_test_split
from config import TEST_SIZE, RANDOM_STATE
from db_helper import get_ratings_df, get_movies_df

class RatingsDataLoader:
    """Veritabanından veriyi okur, map'leri ve train/test setlerini hazırlar."""

    def __init__(self):
        # Artık csv_path argümanına gerek yok
        self.df = None
        self.user_ids = None
        self.movie_ids = None
        self.user_to_index = {}
        self.movie_to_index = {}
        self.movies_df = None
        self.train_df = None
        self.test_df = None

    def load(self):
        print(">> Veritabanından veri okunuyor...")
        
        # 1. Puanları çek (Ratings Tablosu)
        self.df = get_ratings_df()
        
        # 2. Filmleri çek (Movies Tablosu)
        # Veritabanında index movieId idi, reset_index ile sütun haline getiriyoruz
        movies_meta = get_movies_df().reset_index()

        # Tipleri garantiye al
        self.df["userId"] = self.df["userId"].astype(int)
        self.df["movieId"] = self.df["movieId"].astype(int)
        self.df["rating"] = self.df["rating"].astype(float)

        self.user_ids = self.df["userId"].unique().tolist()
        self.movie_ids = self.df["movieId"].unique().tolist()
        
        # Index haritalama
        self.user_to_index = {u: i for i, u in enumerate(self.user_ids)}
        self.movie_to_index = {m: i for i, m in enumerate(self.movie_ids)}

        # Movies DF'i sakla (Sadece rating tablosunda geçen filmleri filtreleyebiliriz veya hepsini tutabiliriz)
        # Tutarlılık için hepsini tutuyoruz.
        self.movies_df = movies_meta

        print(f">> Kullanıcı: {len(self.user_ids)}, Film: {len(self.movie_ids)}")

    def split_train_test(self):
        """Train/test ayırır ve index kolonlarını ekler."""
        if self.df is None:
            raise RuntimeError("Önce load() çağır.")

        train_df, test_df = train_test_split(
            self.df, test_size=TEST_SIZE, random_state=RANDOM_STATE
        )
        train_df = train_df.copy()
        test_df = test_df.copy()

        # userId ve movieId'yi, matris indekslerine (0..N) çeviriyoruz
        train_df["user_index"] = train_df["userId"].map(self.user_to_index)
        train_df["movie_index"] = train_df["movieId"].map(self.movie_to_index)
        test_df["user_index"] = test_df["userId"].map(self.user_to_index)
        test_df["movie_index"] = test_df["movieId"].map(self.movie_to_index)

        # Map edilemeyen (yeni çıkan) verileri temizle
        train_df = train_df.dropna(subset=["user_index", "movie_index"])
        test_df = test_df.dropna(subset=["user_index", "movie_index"])
        
        train_df["user_index"] = train_df["user_index"].astype(int)
        train_df["movie_index"] = train_df["movie_index"].astype(int)
        test_df["user_index"] = test_df["user_index"].astype(int)
        test_df["movie_index"] = test_df["movie_index"].astype(int)

        self.train_df, self.test_df = train_df, test_df
        print(f">> Train: {len(train_df)}, Test: {len(test_df)}")
        return train_df, test_df