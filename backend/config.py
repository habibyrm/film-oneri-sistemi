# config.py

CSV_PATH = "yeni.csv"
SEP = ";"

RATING_THRESHOLD = 3.5

K_FACTORS = 20          # SVD latent faktör
TEST_SIZE = 0.2
RANDOM_STATE = 42

# normal kullanıcı
ALPHA = 0.6             # CF
BETA = 0.3              # İçerik
GAMMA = 0.1             # Popülerlik

# cold-start eşik ve ağırlıklar
COLD_USER_MIN_RATINGS = 10
COLD_ALPHA = 0.2
COLD_BETA = 0.6
COLD_GAMMA = 0.2