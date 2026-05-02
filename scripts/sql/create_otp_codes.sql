-- Run once in Neon → SQL Editor if `otp_codes` is missing (OTP falls back to memory and breaks).
-- Prefer: `cd backend && npm ci && npm run migrate:prod` with DATABASE_URL.

CREATE TABLE IF NOT EXISTS otp_codes (
  phone varchar(15) PRIMARY KEY,
  code varchar(10) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes (expires_at);
