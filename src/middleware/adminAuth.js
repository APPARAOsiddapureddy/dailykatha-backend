import { HttpError } from '../utils/errorHandler.js';

export function adminAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'UNAUTHORIZED', 'Login required'));
  if (!req.user.is_admin && !req.user.isAdmin) {
    return next(new HttpError(403, 'FORBIDDEN', 'Admin access required'));
  }
  next();
}

