import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/errorHandler.js';

/** Production API v1: verifies HS256 JWT; expects numeric `sub` (user id) for favorites. */
export function jwtV1Auth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return next(new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token'));

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.user = payload;
    return next();
  } catch {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Invalid token'));
  }
}
