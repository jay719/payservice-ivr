CREATE TABLE IF NOT EXISTS call_sessions (
  call_sid TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  caller TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  confirmation_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
