import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a short-lived user session token.
 * 
 * @param {Object} payload 
 * @param {string} payload.sub - The user UUID
 * @param {string} payload.role - The user role (tecnico|preparador|atleta)
 * @returns {string} The signed JWT string
 */
export function signUserToken({ sub, role }) {
  return jwt.sign(
    { sub, role, type: 'user' },
    env.JWT_USER_SECRET,
    { expiresIn: env.JWT_USER_EXPIRES_IN }
  );
}

/**
 * Verifies a user session token.
 * 
 * @param {string} token - The JWT string to verify
 * @returns {Object} The decoded token payload containing { sub, role, type, iat, exp }
 * @throws {JsonWebTokenError} If the token is invalid, tampered, or not a 'user' token
 * @throws {TokenExpiredError} If the token is expired
 */
export function verifyUserToken(token) {
  const decoded = jwt.verify(token, env.JWT_USER_SECRET);
  if (decoded.type !== 'user') {
    const err = new Error('Invalid token type');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
}
