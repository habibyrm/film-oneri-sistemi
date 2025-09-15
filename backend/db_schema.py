import sqlite3

DB_NAME = "recsys.db"

MOVIES_SCHEMA = """
CREATE TABLE IF NOT EXISTS movies (
    movieId INTEGER PRIMARY KEY,
    title TEXT,
    genres TEXT,
    overview TEXT,
    keywords TEXT,
    actors TEXT,
    director TEXT,
    popularity REAL
);
"""

RATINGS_SCHEMA = """
CREATE TABLE IF NOT EXISTS ratings (
    userId INTEGER,
    movieId INTEGER,
    rating REAL,
    timestamp INTEGER,
    PRIMARY KEY (userId, movieId)
);
"""

USERS_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    userId INTEGER PRIMARY KEY,
    userName TEXT UNIQUE,
    password TEXT
);
"""

def initialize_database(db_path: str = DB_NAME):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(MOVIES_SCHEMA)
    cursor.execute(RATINGS_SCHEMA)
    cursor.execute(USERS_SCHEMA)
    conn.commit()
    conn.close()
