import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';
import { query } from '../db/pool.js';

export async function jwtAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return next(new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token'));
  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length) return next(new HttpError(401, 'UNAUTHORIZED', 'User not found'));
    req.user = rows[0];
    next();
  } catch {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

export function internalKeyAuth(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return next(new HttpError(403, 'FORBIDDEN', 'Invalid internal key'));
  }
  next();
}
