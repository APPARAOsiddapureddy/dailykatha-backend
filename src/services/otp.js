import crypto from 'crypto';
import { getRedis } from './cache.js';

const TTL = 600;

function key(phone) {
  return `otp:${phone}`;
}

export async function storeOtp(phoneDigits) {
  const code = crypto.randomInt(100000, 999999).toString();
  const r = getRedis();
  if (r) {
    try {
      await r.set(key(phoneDigits), code, 'EX', TTL);
      return code;
    } catch {
      // Redis may be temporarily unavailable/misconfigured (common on fresh Render envs).
      // Fall back to in-memory OTP storage so auth flow still works end-to-end.
    }
  } else {
    // continue to in-memory
  }
  globalThis.__otpMem = globalThis.__otpMem || new Map();
  globalThis.__otpMem.set(key(phoneDigits), { code, exp: Date.now() + TTL * 1000 });
  return code;
}

export async function verifyOtp(phoneDigits, code) {
  const r = getRedis();
  if (r) {
    try {
      const stored = await r.get(key(phoneDigits));
      if (!stored || stored !== code) return false;
      await r.del(key(phoneDigits));
      return true;
    } catch {
      // fall through to in-memory check
    }
  }
  globalThis.__otpMem = globalThis.__otpMem || new Map();
  const e = globalThis.__otpMem.get(key(phoneDigits));
  if (!e || e.exp < Date.now() || e.code !== code) return false;
  globalThis.__otpMem.delete(key(phoneDigits));
  return true;
}
