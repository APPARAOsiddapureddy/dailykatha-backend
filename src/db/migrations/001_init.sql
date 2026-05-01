CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE,
  name VARCHAR(100),
  content_language VARCHAR(5) DEFAULT 'te',
  religion_id VARCHAR(20),
  region VARCHAR(5) DEFAULT 'IN',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_interests (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_id VARCHAR(30) NOT NULL,
  rank INT DEFAULT 0,
  PRIMARY KEY (user_id, interest_id)
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(20),
  category VARCHAR(30),
  mood VARCHAR(20),
  is_festival BOOLEAN DEFAULT FALSE,
  festival VARCHAR(50),
  quote JSONB NOT NULL,
  author JSONB NOT NULL,
  embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_cards_category ON cards (category) WHERE is_active = TRUE;
CREATE INDEX idx_cards_section ON cards (section) WHERE is_active = TRUE;
CREATE INDEX idx_cards_created ON cards (created_at DESC);
CREATE INDEX idx_cards_festival ON cards (is_festival) WHERE is_active = TRUE;

CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON interactions (user_id, created_at DESC);
CREATE INDEX idx_interactions_card ON interactions (card_id);
CREATE INDEX idx_interactions_trending ON interactions (card_id, action, created_at);

CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'pending',
  input_payload JSONB,
  output_cards JSONB,
  error JSONB,
  model VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_generation_jobs_status ON generation_jobs (status, created_at);
