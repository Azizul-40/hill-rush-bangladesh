-- Hill Rush Bangladesh — লিডারবোর্ড (Cloudflare D1)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  token_hash TEXT NOT NULL,
  guest INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
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
CREATE TABLE IF NOT EXISTS progress (
  player_id TEXT PRIMARY KEY,
  unlocked INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_progress_board ON progress (completed DESC, unlocked DESC, coins DESC);
