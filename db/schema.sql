-- Hill Rush Bangladesh — লিডারবোর্ড (Cloudflare D1)
-- v39: নাম + PIN দিয়ে রেজিস্টার/লগইন (অন্য ফোন থেকেও একই প্রোফাইল), এন্ডলেস দূরত্বের বোর্ড, একাধিক ডিভাইসের টোকেন।
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT,                 -- ছোট হাতের নাম (নিবন্ধিত হলে অনন্য)
  email TEXT UNIQUE,
  token_hash TEXT NOT NULL,
  pin_hash TEXT,                 -- sha256(id + ":" + PIN); গেস্টের নেই
  fails INTEGER NOT NULL DEFAULT 0,
  lock_until INTEGER NOT NULL DEFAULT 0,
  guest INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_name ON players (name_key);
CREATE TABLE IF NOT EXISTS tokens (
  player_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (player_id, token_hash)
);
CREATE TABLE IF NOT EXISTS scores (
  player_id TEXT NOT NULL,
  map INTEGER NOT NULL,
  level INTEGER NOT NULL,
  time REAL NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (player_id, map, level)
);
CREATE INDEX IF NOT EXISTS idx_scores_board ON scores (map, level, time);
CREATE TABLE IF NOT EXISTS endless (
  player_id TEXT NOT NULL,
  map INTEGER NOT NULL,
  dist INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (player_id, map)
);
CREATE INDEX IF NOT EXISTS idx_endless_board ON endless (map, dist DESC);
CREATE TABLE IF NOT EXISTS progress (
  player_id TEXT PRIMARY KEY,
  unlocked INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_progress_board ON progress (completed DESC, unlocked DESC, coins DESC);

-- v45: ইমেইলে ভেরিফিকেশন কোড, প্রোফাইল (ছবি, মোট আয় করা কয়েন), ক্লাউড সেভ
CREATE TABLE IF NOT EXISTS email_codes (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  last_sent INTEGER NOT NULL,
  PRIMARY KEY (email, purpose)
);
CREATE TABLE IF NOT EXISTS profile (
  player_id TEXT PRIMARY KEY,
  avatar INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  earned INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS cloudsave (
  player_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS race_rooms (code TEXT PRIMARY KEY, host TEXT NOT NULL, level INTEGER NOT NULL, map INTEGER NOT NULL DEFAULT 0, maxp INTEGER NOT NULL, pub INTEGER NOT NULL, status TEXT NOT NULL, start_at INTEGER NOT NULL DEFAULT 0, ready_at INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_race_rooms_q ON race_rooms (pub, status, level, created);
CREATE TABLE IF NOT EXISTS race_players (code TEXT NOT NULL, pid TEXT NOT NULL, name TEXT NOT NULL, x REAL NOT NULL DEFAULT 0, fin REAL, joined INTEGER NOT NULL, seen INTEGER NOT NULL, PRIMARY KEY (code, pid));
