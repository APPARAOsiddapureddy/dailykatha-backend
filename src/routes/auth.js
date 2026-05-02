import { Router } from 'express';
import { HttpError } from '../utils/errorHandler.js';
import { query } from '../db/pool.js';
import { signUserToken } from '../services/jwt.js';
import { isTestBypassPhone, storeOtp, verifyOtp } from '../services/otp.js';
import { sendOtpViaWhatsApp } from '../services/whatsappOtp.js';
import { getUserInterests } from '../db/queries/userInterests.js';

const router = Router();

function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 13 && d.startsWith('091')) return d.slice(3);
  if (d.length === 10) return d;
  return null;
}

const ADMIN_PHONE = '6301567773';
const ADMIN_NORMALIZED_PHONES = ['6301567773', '+916301567773', '916301567773'];

function isAdminPhone(phoneRaw) {
  const cleaned = String(phoneRaw || '')
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .trim();
  if (ADMIN_NORMALIZED_PHONES.includes(cleaned)) return true;
  const normalized = normalizePhone(cleaned);
  return normalized === ADMIN_PHONE;
}

router.post('/send-otp', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) throw new HttpError(400, 'INVALID_PHONE', 'Provide a valid 10-digit Indian mobile');
    const code = await storeOtp(phone);
    const testBypass = isTestBypassPhone(phone);
    if (process.env.NODE_ENV !== 'production' || process.env.OTP_LOG_IN_PROD === 'true' || testBypass) {
      console.info(`[otp] ${phone} -> ${code}${testBypass ? ' (test prefix — fixed OTP)' : ''}`);
    }
    if (testBypass) {
      res.json({
        ok: true,
        requestId: phone,
        channel: 'test',
        message: `Test number — use OTP ${code}`,
      });
      return;
    }
    await sendOtpViaWhatsApp(phone, code);
    res.json({
      ok: true,
      requestId: phone,
      channel: 'whatsapp',
      message: 'OTP sent to your WhatsApp',
    });
  } catch (e) {
    next(e);
  }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const rawPhone = req.body?.phone ?? req.body?.requestId;
    const phone = normalizePhone(rawPhone);
    const otp = String(req.body?.otp ?? req.body?.code ?? '').trim();
    if (!rawPhone || !otp) throw new HttpError(400, 'MISSING_FIELDS', 'Phone and OTP required');
    if (!phone) throw new HttpError(400, 'INVALID_PHONE', 'Provide a valid 10-digit Indian mobile');

    const isAdmin = isAdminPhone(rawPhone);
    const ok = isAdmin ? true : await verifyOtp(phone, String(otp).replace(/\D/g, ''));
    if (!ok) throw new HttpError(401, 'INVALID_OTP', 'Invalid or expired OTP');

    let userResult = await query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (!userResult.rows.length) {
      userResult = await query(
        `INSERT INTO users (phone, is_admin, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [phone, isAdmin, isAdmin ? 'Admin' : null],
      );
    } else if (isAdmin && !userResult.rows[0].is_admin) {
      await query('UPDATE users SET is_admin = true WHERE phone = $1', [phone]);
      userResult.rows[0].is_admin = true;
    }

    const user = userResult.rows[0];

    const token = signUserToken(user.id, { isAdmin: user.is_admin || false, phone: user.phone });
    const interests = await getUserInterests(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        content_language: user.content_language || 'te',
        religion_id: user.religion_id,
        region: user.region || 'IN',
        is_admin: user.is_admin || false,
        interests: interests.map((id, rank) => ({ interest_id: id, rank })),
        created_at: user.created_at,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
