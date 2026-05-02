import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { getRedis } from './cache.js';

const TTL = 600;

/** QA numbers: 10 digits starting with this prefix always use [TEST_FIXED_OTP]. */
export const TEST_PHONE_PREFIX = '123456';
export const TEST_FIXED_OTP = '560102';

function key(phone) {
  return `otp:${phone}`;
}

export function isTestBypassPhone(phoneDigits) {
  const p = String(phoneDigits || '').replace(/\D/g, '');
  return p.length === 10 && p.startsWith(TEST_PHONE_PREFIX);
}

async function storeOtpPostgres(phoneDigits, code) {
  const exp = new Date(Date.now() + TTL * 1000);
  await pool.query(
    `INSERT INTO otp_codes (phone, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE SET
       code = EXCLUDED.code,
       expires_at = EXCLUDED.expires_at`,
    [phoneDigits, code, exp],
  );
}

async function verifyOtpPostgres(phoneDigits, codeNorm) {
  await pool.query(`DELETE FROM otp_codes WHERE expires_at < NOW()`);
  const r = await pool.query(
    `DELETE FROM otp_codes
     WHERE phone = $1 AND code = $2 AND expires_at > NOW()
     RETURNING phone`,
    [phoneDigits, codeNorm],
  );
  return r.rowCount > 0;
}

export async function storeOtp(phoneDigits) {
  const code = isTestBypassPhone(phoneDigits)
    ? TEST_FIXED_OTP
    : crypto.randomInt(100000, 999999).toString();

  const r = getRedis();
  if (r) {
    try {
      await r.set(key(phoneDigits), code, 'EX', TTL);
      // Keep Postgres in sync so verify works if Redis key missing / multi-instance / eviction.
      try {
        await storeOtpPostgres(phoneDigits, code);
      } catch (e) {
        console.warn('[otp] Postgres dual-write after Redis failed:', e.message);
      }
      return code;
    } catch {
      // fall through to Postgres / memory
    }
  }

  try {
    await storeOtpPostgres(phoneDigits, code);
    return code;
  } catch (e) {
    console.warn('[otp] Postgres store failed, using in-memory:', e.message);
  }

  globalThis.__otpMem = globalThis.__otpMem || new Map();
  globalThis.__otpMem.set(key(phoneDigits), { code, exp: Date.now() + TTL * 1000 });
  return code;
}

export async function verifyOtp(phoneDigits, code) {
  const codeNorm = String(code).replace(/\D/g, '');

  const r = getRedis();
  if (r) {
    try {
      const stored = await r.get(key(phoneDigits));
      if (stored === codeNorm) {
        await r.del(key(phoneDigits));
        return true;
      }
      // Wrong OTP present in Redis — do not fall through (Postgres would still hold an old code).
      if (stored != null && stored !== codeNorm) {
        return false;
      }
      // Key missing in Redis — try Postgres / memory (instances differ or TTL/eviction).
    } catch {
      // Redis error — fall through to Postgres / memory
    }
  }

  try {
    return await verifyOtpPostgres(phoneDigits, codeNorm);
  } catch (e) {
    console.warn('[otp] Postgres verify failed, using in-memory:', e.message);
  }

  globalThis.__otpMem = globalThis.__otpMem || new Map();
  const e = globalThis.__otpMem.get(key(phoneDigits));
  if (!e || e.exp < Date.now() || e.code !== codeNorm) return false;
  globalThis.__otpMem.delete(key(phoneDigits));
  return true;
}
