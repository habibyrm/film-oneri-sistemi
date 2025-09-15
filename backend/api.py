import json
import os
import random
import pandas as pd
from typing import List, Optional, Set

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_loader import RatingsDataLoader
from cf_svd import SVDRecommender
from content_v2 import ContentBasedRecommenderV2
from hibrit import HybridRecommender
import db_helper

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print(">> Veri yükleniyor (DB)...")
loader = RatingsDataLoader() # Parametreye gerek yok
loader.load()
train_df, test_df = loader.split_train_test()

num_users = len(loader.user_ids)
num_movies = len(loader.movie_ids)

print(">> SVD modeli eğitiliyor...")
svd = SVDRecommender(num_users=num_users, num_movies=num_movies)
svd.fit(train_df)

print(">> Content modeli hazırlanıyor (DB)...")
content_model = ContentBasedRecommenderV2() # Parametreye gerek yok

print(">> Hibrit model hazırlanıyor...")
hybrid_model = HybridRecommender(
    svd=svd,
    content_model=content_model,
    movies_df=loader.movies_df,
    user_to_index=loader.user_to_index,
    train_ratings=train_df,
)

VALID_USER_IDS = set(int(uid) for uid in loader.user_ids)
COLD_USER_ID = 999_999

# --- ENDPOINTLER ---

@app.get("/survey-movies")
def survey_movies(n: int = 10):
    movies_df = hybrid_model.movies_df.copy()
    movies_df["popularity_score"] = hybrid_model.pop_scores

    top = (
        movies_df.sort_values("popularity_score", ascending=False)
        .head(n)
        .reset_index(drop=True)
    )

    result = []
    for _, row in top.iterrows():
        result.append(
            {
                "movieId": int(row["movieId"]),
                "title": row.get("title", ""),
                "popularity": float(row["popularity_score"]),
            }
        )
    return result


@app.get("/check-user")
def check_user(user_id: int):
    # Veritabanında var mı diye bakmak daha doğru olur
    user = db_helper.get_user_by_id(user_id)
    return {"valid": user is not None}


class Rating(BaseModel):
    movieId: int
    rating: float


class RatingPayload(BaseModel):
    ratings: List[Rating]
    user_id: Optional[int] = None
    exclude_movie_ids: Optional[List[int]] = None


def _safe_int_set(values) -> Set[int]:
    out = set()
    if not values:
        return out
    for v in values:
        try:
            out.add(int(v))
        except Exception:
            pass
    return out


@app.get("/recommend-user")
def recommend_user(user_id: int, n_recs: int = 10):
    """
    Var olan bir kullanıcı için (login olmuş) öneri üretir.
    Sadece user_id alır, ekstra bir rating listesi almaz.
    """
    print(f">> [REC-USER] UserID: {user_id} için öneri isteniyor...")
    
    # Kullanıcı veritabanında var mı?
    user = db_helper.get_user_by_id(user_id)
    if not user:
         # Kullanıcı yoksa boş dön veya cold-start gibi davran
         print(f"   - Kullanıcı {user_id} veritabanında bulunamadı.")
         return []

    # Hibrit öneri çağıyoruz (user_ratings=None çünkü geçmişini kullanacak)
    recs = hybrid_model.recommend(
        user_id=user_id,
        n_recs=n_recs,
        user_ratings=None
    )
    
    if recs is None or len(recs) == 0:
        return []
    
    # Formatlama
    result = []
    for cls_idx, row in recs.iterrows():
         result.append({
             "movieId": int(row["movieId"]),
             "title": row["title"],
             "hybrid_score": float(row["hybrid_score"])
         })
         
    return result


@app.post("/recommend-from-ratings")
def recommend_from_ratings(payload: RatingPayload, n_recs: int = 10):
    """
    Kullanıcının anlık gönderdiği puanlara göre öneri yapar.
    Ayrıca bu puanları veritabanına KAYDEDER.
    """
    user_ratings = payload.ratings
    user_id = payload.user_id
    exclude_ids = set(payload.exclude_movie_ids) if payload.exclude_movie_ids else set()

    # 1. Puanları DB'ye kaydet (Eğer user_id varsa)
    if user_id:
        print(f"💾 [API] User {user_id} için {len(user_ratings)} yeni puan kaydediliyor...")
        count = 0
        for r in user_ratings:
            if r.movieId is None: continue
            
            # 0.5 puanı "Dislike" olarak loglayalım ama DB'ye olduğu gibi kaydedelim.
            # (DB helper zaten float kabul ediyor)
            success = db_helper.add_rating(user_id, r.movieId, r.rating)
            if success:
                count += 1
                if r.rating == 0.5:
                    print(f"   👎 Dislike kaydedildi -> Movie: {r.movieId}")
        print(f"✅ [API] Toplam {count} rating veritabanına işlendi.")

    # 2. Öneri üret (Anlık ratingleri de kullanarak)
    # Pydantic modelini dict'e çevir
    ratings_dict = [{"movieId": r.movieId, "rating": r.rating} for r in user_ratings if r.movieId is not None]

    if not ratings_dict and not user_id:
         return {"recommendations": []}

    recs = hybrid_model.recommend(user_id=user_id if user_id else COLD_USER_ID, 
                                  n_recs=n_recs + len(exclude_ids) + 5,
                                  user_ratings=ratings_dict)
    
    if recs.empty:
        return {"recommendations": []}
        
    # 3. Exclude edilenleri filtrele
    if exclude_ids:
        recs = recs[~recs["movieId"].isin(exclude_ids)]
    
    recs = recs.head(n_recs)

    result = recs.to_dict(orient="records")
    return {"recommendations": result}


# =========================================
# ADMIN / ANALYTICS ENDPOINTS
# =========================================

@app.get("/admin/analytics")
def admin_analytics():
    """
    TEST verisi üzerinde SVD vs Content vs Hybrid Recall@20 başarısını hesaplar.
    Bu işlem ağır olabilir (birkaç saniye/dakika sürebilir).
    """
    print("🚀 [API] Admin Analytics isteği geldi. Hesaplama başlıyor...")
    # main.py'den veya global scope'tan test_df'i kullanıyoruz.
    # api.py en başta "from main import test_df" vb yapmış olmalı veya burada data_loader'dan okumalı.
    # Ancak api.py şu an main.py'deki mantığı kopyalayarak çalışıyor. 
    # train_df, test_df global olarak tanımlı varsayıyoruz. 
    # (Not: Eğer tanımlı değilse hata verir, aşağıda kontrol edeceğiz)
    
    try:
        results = hybrid_model.evaluate_components(test_df, k=20)
        return {"success": True, "results": results}
    except Exception as e:
        print(f"❌ [API] Analytics Error: {e}")
        return {"success": False, "error": str(e)}

@app.get("/admin/inspect-user")
def admin_inspect_user(user_id: int):
    """
    Belirli bir kullanıcı için önerilerin detaylı skor analizini döner.
    """
    print(f"🕵️ [API] Admin Inspect User: {user_id}")
    try:
        explanations = hybrid_model.explain_recommendation(user_id, n_recs=20)
        return {"success": True, "user_id": user_id, "recommendations": explanations}
    except Exception as e:
        print(f"❌ [API] Inspect Error: {e}")
        return {"success": False, "error": str(e)}


# ==========================================
# VERİTABANI TABANLI AUTH (Login/Register)
# ==========================================

class AuthRequest(BaseModel):
    username: str # Burada username olarak ID bekliyoruz senin senaryonda
    password: str

@app.post("/register")
def register(auth: AuthRequest):
    success, result = db_helper.register_user(auth.username, auth.password)
    
    if not success:
         return {"success": False, "message": result}
    
    return {"success": True, "message": "Kayıt başarılı!", "user_id": result}

@app.post("/login")
def login(auth: AuthRequest):
    success, user_id = db_helper.check_user_login(auth.username, auth.password)

    if success:
        return {"success": True, "message": "Giriş başarılı.", "user_id": user_id}
    else:
        return {"success": False, "message": "Hatalı Kullanıcı Adı veya Şifre."}