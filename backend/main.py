import pandas as pd
from data_loader import RatingsDataLoader
from cf_svd import SVDRecommender
from content_v2 import ContentBasedRecommenderV2
from hibrit import HybridRecommender

def main():
    # ---------------------------
    # 1. Veri yükle (DB'den)
    # ---------------------------
    loader = RatingsDataLoader()
    loader.load()
    train_df, test_df = loader.split_train_test()

    num_users = len(loader.user_ids)
    num_movies = len(loader.movie_ids)

    # ---------------------------
    # 2. CF (SVD) modeli eğit
    # ---------------------------
    svd = SVDRecommender(num_users=num_users, num_movies=num_movies)
    svd.fit(train_df)

    # ---------------------------
    # 3. Content model (DB'den)
    # ---------------------------
    content_model = ContentBasedRecommenderV2()

    # ---------------------------
    # 4. Hybrid model
    # ---------------------------
    hybrid = HybridRecommender(
        svd=svd,
        content_model=content_model,
        movies_df=loader.movies_df,
        user_to_index=loader.user_to_index,
        train_ratings=train_df
    )

    # ---------------------------
    # 5. Cold-start kullanıcı testi
    # ---------------------------
    print("\n--- TEST BAŞLIYOR ---")
    all_movies = loader.movies_df.copy()
    sample_movies = all_movies.sample(5)

    print(">>> Rastgele 5 film için puan ver (Test Amaçlı):")
    user_ratings = []
    for _, row in sample_movies.iterrows():
        # Otomatik 4 puan verelim test hızlı olsun
        print(f"Otomatik puanlanıyor: {row['title']} -> 4.0")
        user_ratings.append({"movieId": row["movieId"], "rating": 4.0})

    # ---------------------------
    # 6. Öneri üret
    # ---------------------------
    cold_user_id = 999999
    recs = hybrid.recommend(user_id=cold_user_id, n_recs=5, user_ratings=user_ratings)

    print("\n> Hibrit öneriler:")
    for i, row in recs.iterrows():
        print(f"{i+1}. {row['title']} (Score={row['hybrid_score']:.4f})")

if __name__ == "__main__":
    main()