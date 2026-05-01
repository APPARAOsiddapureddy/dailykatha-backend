-- Today's generated picks per interest
CREATE TABLE IF NOT EXISTS todays_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interest_id VARCHAR(30) NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  rank INT NOT NULL DEFAULT 0,           -- 1-5
  generation_score FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pick_date, interest_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_todays_picks_date_interest
  ON todays_picks (pick_date, interest_id, rank ASC);

CREATE INDEX IF NOT EXISTS idx_todays_picks_date
  ON todays_picks (pick_date DESC);

-- User's today's picks view (personalized top 5 from their interests)
CREATE TABLE IF NOT EXISTS user_todays_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  rank INT NOT NULL,           -- 1-5
  interest_id VARCHAR(30),
  shown_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pick_date, rank)
);

CREATE INDEX IF NOT EXISTS idx_user_todays_picks_user_date
  ON user_todays_picks (user_id, pick_date DESC);

