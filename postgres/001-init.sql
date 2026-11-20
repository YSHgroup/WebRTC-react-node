CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  online BOOLEAN NOT NULL DEFAULT false,
  last_seen BIGINT,
  joined_defaults BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dm', 'group')),
  name TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  members TEXT[] NOT NULL,
  admins TEXT[] NOT NULL DEFAULT '{}',
  last_message JSONB,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  cid TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  reply_to JSONB,
  forwarded_from TEXT,
  attachment JSONB
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (cid, created_at DESC);

