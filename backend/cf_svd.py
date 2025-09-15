# cf_svd.py
import numpy as np
import pandas as pd
from scipy.sparse.linalg import svds

from config import K_FACTORS


class SVDRecommender:
    """SVD tabanlı rating tahmincisi (CF tarafı)."""

    def __init__(self, num_users: int, num_movies: int):
        self.num_users = num_users
        self.num_movies = num_movies
        self.predicted = None      # tahmin edilen rating matrisi
        self.cf_norm = None        # [0,1] normalize CF skorları

    def fit(self, train_df: pd.DataFrame):
        """Train verisinden SVD tahmin matrisi hesaplar."""
        R_df = train_df.pivot(
            index="user_index",
            columns="movie_index",
            values="rating"
        ).reindex(
            index=range(self.num_users),
            columns=range(self.num_movies)
        )

        user_means = R_df.mean(axis=1)

        # Eksikleri satır ortalaması ile doldur
        R_filled = (
            R_df.apply(lambda row: row.fillna(row.mean()), axis=1)
            .fillna(0.0)
        )

        R = R_filled.values
        R_demeaned = R - user_means.values.reshape(-1, 1)

        print(">> SVD hesaplanıyor...")
        U, sigma, Vt = svds(R_demeaned, k=K_FACTORS)
        sigma = np.diag(sigma)

        self.predicted = (
            np.dot(np.dot(U, sigma), Vt)
            + user_means.values.reshape(-1, 1)
        )
        print(">> SVD tamamlandı:", self.predicted.shape)

        self.cf_norm = self._normalize(self.predicted)

    @staticmethod
    def _normalize(mat: np.ndarray) -> np.ndarray:
        """Her kullanıcı satırını [0,1] aralığına çeker."""
        min_vals = mat.min(axis=1, keepdims=True)
        max_vals = mat.max(axis=1, keepdims=True)
        denom = max_vals - min_vals
        denom[denom == 0] = 1.0
        return (mat - min_vals) / denom
