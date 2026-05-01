-- Performance indexes (transaction-safe; no CONCURRENTLY because migrate runner wraps in BEGIN/COMMIT)

-- Trigram indexes for multilingual search (requires pg_trgm)
CREATE INDEX IF NOT EXISTS idx_cards_quote_te_trgm
  ON cards USING GIN ((quote->>'te') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_quote_hi_trgm
  ON cards USING GIN ((quote->>'hi') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_quote_en_trgm
  ON cards USING GIN ((quote->>'en') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_quote_ta_trgm
  ON cards USING GIN ((quote->>'ta') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_quote_kn_trgm
  ON cards USING GIN ((quote->>'kn') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_quote_ml_trgm
  ON cards USING GIN ((quote->>'ml') gin_trgm_ops);

-- Author trgm (helps author search too)
CREATE INDEX IF NOT EXISTS idx_cards_author_te_trgm
  ON cards USING GIN ((author->>'te') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cards_author_en_trgm
  ON cards USING GIN ((author->>'en') gin_trgm_ops);

-- Category + active + created_at (feed queries)
CREATE INDEX IF NOT EXISTS idx_cards_category_active_created
  ON cards (category, is_active, created_at DESC);

-- Festival cards
CREATE INDEX IF NOT EXISTS idx_cards_festival_active_created
  ON cards (is_festival, is_active, created_at DESC);

-- Interactions lookup
CREATE INDEX IF NOT EXISTS idx_interactions_user_action_created
  ON interactions (user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_card_action_created
  ON interactions (card_id, action, created_at DESC);

-- User interests lookup
CREATE INDEX IF NOT EXISTS idx_user_interests_user_rank
  ON user_interests (user_id, rank ASC);

-- Generation jobs status lookup
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status_created
  ON generation_jobs (status, created_at DESC);

