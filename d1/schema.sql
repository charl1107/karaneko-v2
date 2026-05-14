-- ============================================================
-- Karaneko D1 (SQLite) Schema
-- Run: wrangler d1 execute karaneko-db --file=./d1/schema.sql
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  email_verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Existing D1 databases created before email verification need these columns.
-- SQLite/D1 does not support IF NOT EXISTS for ADD COLUMN; ignore duplicate
-- column errors if you run these manually on a database that already has them.
-- ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN verified_at TEXT;

-- Songs catalog (admin managed)
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  youtube_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  thumbnail TEXT,
  category TEXT,
  featured INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Scores
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  pitch_score INTEGER NOT NULL,
  timing_score INTEGER NOT NULL,
  stability_score INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  rank TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  thumbnail TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, youtube_id)
);

-- Play history
CREATE TABLE IF NOT EXISTS play_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  thumbnail TEXT,
  played_at TEXT DEFAULT (datetime('now'))
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  query TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Party Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT UNIQUE NOT NULL,
  host_id TEXT REFERENCES users(id),
  current_youtube_id TEXT,
  current_title TEXT,
  current_artist TEXT,
  current_thumbnail TEXT,
  is_playing INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now'))
);

-- Room Queue
CREATE TABLE IF NOT EXISTS room_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  thumbnail TEXT,
  added_by TEXT DEFAULT 'Guest',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Room Members
CREATE TABLE IF NOT EXISTS room_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS scores_total_idx ON scores(total_score DESC);
CREATE INDEX IF NOT EXISTS scores_youtube_idx ON scores(youtube_id);
CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites(user_id);
CREATE INDEX IF NOT EXISTS history_user_idx ON play_history(user_id);
CREATE INDEX IF NOT EXISTS rooms_code_idx ON rooms(code);
CREATE INDEX IF NOT EXISTS queue_room_idx ON room_queue(room_id, position);

-- ============================================================
-- Seed categories
-- ============================================================
INSERT OR IGNORE INTO categories (slug, label, emoji, query, sort_order) VALUES
  ('pop',     'Pop',     '🎵', 'pop karaoke hits 2024',          1),
  ('rock',    'Rock',    '🎸', 'rock karaoke classics',           2),
  ('kpop',    'K-Pop',   '🇰🇷', 'kpop karaoke BTS BLACKPINK',   3),
  ('rnb',     'R&B',     '🎷', 'R&B soul karaoke',               4),
  ('opm',     'OPM',     '🇵🇭', 'OPM karaoke Filipino songs',   5),
  ('classic', 'Classic', '🏆', 'classic oldies karaoke',         6),
  ('hiphop',  'Hip-Hop', '🎤', 'hip hop rap karaoke',            7),
  ('ballad',  'Ballad',  '💙', 'ballad emotional karaoke',       8);

-- ============================================================
-- Email verification codes (add to existing schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS verification_email_idx ON verification_codes(email);
