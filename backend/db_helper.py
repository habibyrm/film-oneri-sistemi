import sqlite3
import os
from pathlib import Path
import pandas as pd
import bcrypt

from db_schema import initialize_database

DB_NAME = Path(__file__).resolve().parent / "recsys.db"


def get_db_connection():
    """Veritabanı bağlantısı oluşturur."""
    if not DB_NAME.exists():
        initialize_database(DB_NAME)
    conn = sqlite3.connect(str(DB_NAME))
    conn.row_factory = sqlite3.Row
    return conn

# --- VERİ OKUMA ---
def get_movies_df():
    """Filmleri çeker. movieId index olarak gelir."""
    conn = get_db_connection()
    df = pd.read_sql("SELECT * FROM movies", conn, index_col="movieId")
    conn.close()
    return df

def get_ratings_df():
    """Puanları çeker."""
    conn = get_db_connection()
    df = pd.read_sql("SELECT * FROM ratings", conn)
    conn.close()
    return df

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE userId = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_username(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE userName = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_next_user_id():
    """Yeni kullanıcı için bir sonraki userId'yi bulur."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Mevcut en büyük ID'yi bul
    cursor.execute("SELECT MAX(userId) FROM users")
    max_id = cursor.fetchone()[0]
    conn.close()
    
    # Eğer hiç kullanıcı yoksa 1'den başla, varsa max + 1
    if max_id is None:
        return 1
    return max_id + 1

# --- AUTH & GÜVENLİK ---
def hash_password(plain_password):
    return bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_user_login(username, plain_password):
    user = get_user_by_username(username)
    if user:
        stored_hash = user['password']
        # Eski veriler için düz metin kontrolü (geçici)
        if not stored_hash.startswith("$2b$"): 
            return str(stored_hash) == str(plain_password), user['userId']
        
        is_valid = bcrypt.checkpw(plain_password.encode('utf-8'), stored_hash.encode('utf-8'))
        return is_valid, user['userId']
    return False, None

def register_user(username, password):
    """Yeni kullanıcı kaydeder (Username + Password). ID otomatik atanır."""
    
    # Önce kullanıcı adı var mı kontrol et
    if get_user_by_username(username):
        return False, "Bu kullanıcı adı zaten alınmış."

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        new_id = get_next_user_id() # Yeni ID al
        hashed_pw = hash_password(password)
        
        cursor.execute("INSERT INTO users (userId, userName, password) VALUES (?, ?, ?)", 
                       (new_id, username, hashed_pw))
        conn.commit()
        return True, new_id
    except sqlite3.IntegrityError:
        return False, "Veritabanı hatası."
    except Exception as e:
        print(f"Register Error: {e}")
        return False, str(e)
    finally:
        conn.close()

# --- PUAN EKLEME ---
def add_rating(user_id, movie_id, rating):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM ratings WHERE userId = ? AND movieId = ?", (user_id, movie_id))
        cursor.execute("INSERT INTO ratings (userId, movieId, rating) VALUES (?, ?, ?)", 
                       (user_id, movie_id, rating))
        conn.commit()
        return True
    except Exception as e:
        print(f"Hata: {e}")
        return False
    finally:
        conn.close()