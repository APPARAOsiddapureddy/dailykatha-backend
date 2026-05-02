-- =============================================================================
-- REFERENCE / MANUAL RUN — not executed by `node-pg-migrate` (that uses *.js).
-- Idempotent snippets for Neon SQL Editor or emergency bootstrap.
-- Primary migrations: `npm run migrate` → `1714550400000_init_v1_public_api.js`,
-- `1747363200000_otp_codes.js`.
-- Legacy card/feed schema (UUID users, cards, …): `src/db/migrations/*.sql`
-- =============================================================================

CREATE TABLE IF NOT EXISTS otp_codes (
  phone varchar(15) PRIMARY KEY,
  code varchar(10) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes (expires_at);
