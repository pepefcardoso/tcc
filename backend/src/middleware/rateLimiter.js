import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler.js';
import { env } from '../config/env.js';

function makeHandler(errorCode, message) {
  return (_req, _res, next) => next(new AppError(429, errorCode, message));
}

export const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: makeHandler('rate_limited', 'Too many login attempts. Please try again later.'),
});

export const uploadLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
  limit: env.RATE_LIMIT_UPLOAD_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: makeHandler('rate_limited', 'Upload rate limit exceeded. Please try again later.'),
});
