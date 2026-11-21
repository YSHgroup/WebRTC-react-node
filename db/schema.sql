-- Huddle schema (idempotent). Run with `npm run db:migrate` or paste into the Neon SQL editor.
-- Statements are separated by a semicolon at the end of a line; do not use $$ blocks in this file.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  password_hash   TEXT,
  google_sub      TEXT,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  photo_url       TEXT,
  photo_data      TEXT,
  photo_version   INTEGER NOT NULL DEFAULT 0,
  bio             TEXT NOT NULL DEFAULT '',
  created_at      BIGINT NOT NULL,
  last_login_at   BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users (phone) WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversations (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('dm', 'group')),
  name         TEXT,
  description  TEXT,
  color        TEXT,
  icon         TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT false,
  created_by   TEXT,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL,
  last_message JSONB
);

CREATE TABLE IF NOT EXISTS conversation_members (
  cid           TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  uid           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at     BIGINT NOT NULL,
  last_read_at  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (cid, uid)
);

CREATE INDEX IF NOT EXISTS conversation_members_uid_idx ON conversation_members (uid);

CREATE TABLE IF NOT EXISTS attachments (
  id          TEXT PRIMARY KEY,
  uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('image', 'file')),
  name        TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  data_b64    TEXT NOT NULL,
  created_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id             TEXT PRIMARY KEY,
  cid            TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text           TEXT NOT NULL DEFAULT '',
  created_at     BIGINT NOT NULL,
  reply_to       JSONB,
  forwarded_from TEXT,
  attachment_id  TEXT REFERENCES attachments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS messages_cid_created_idx ON messages (cid, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_attachment_idx ON messages (attachment_id) WHERE attachment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_codes (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  BIGINT NOT NULL,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_codes_uid_idx ON auth_codes (uid, purpose);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start BIGINT NOT NULL
);

-- The five default groups. They are public: everyone is added when they register.
INSERT INTO conversations (id, type, name, description, color, icon, is_public, created_at, updated_at) VALUES
  ('development',  'group', 'Development',  'Official group for all development team members and updates.', '#7C5CFF', 'code',      true, 0, 0),
  ('hr',           'group', 'HR Team',      'Human Resources team discussions and important updates.',       '#64748B', 'users',     true, 0, 0),
  ('introduction', 'group', 'Introduction', 'Say hello and tell the team a little about yourself.',          '#F59E0B', 'hand',      true, 0, 0),
  ('partners',     'group', 'Partners',     'Shared space with our partners.',                               '#0EA5E9', 'handshake', true, 0, 0),
  ('topic-off',    'group', 'Topic-off',    'Anything goes — off-topic chat.',                               '#EC4899', 'coffee',    true, 0, 0)
ON CONFLICT (id) DO NOTHING;
