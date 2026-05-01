import { validationResult } from 'express-validator';
import { HttpError } from '../utils/errorHandler.js';

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', result.array({ onlyFirstError: true })));
}

