import jwt from 'jsonwebtoken';

export function signUserToken(userId, extra = {}) {
  return jwt.sign({ sub: userId, ...extra }, process.env.JWT_SECRET, { expiresIn: '90d' });
}
