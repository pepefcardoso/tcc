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

/**
 * Signs a long-lived device service token.
 * 
 * @param {Object} payload 
 * @param {string} payload.sub - The device identifier (e.g. MAC address or firmware UUID)
 * @returns {string} The signed JWT string
 */
export function signDeviceToken({ sub }) {
  return jwt.sign(
    { sub, type: 'device' },
    env.JWT_DEVICE_SECRET,
    { expiresIn: env.JWT_DEVICE_EXPIRES_IN }
  );
}

/**
 * Verifies a device service token.
 * 
 * @param {string} token - The JWT string to verify
 * @returns {Object} The decoded token payload containing { sub, type, iat, exp }
 * @throws {JsonWebTokenError} If the token is invalid, tampered, or not a 'device' token
 * @throws {TokenExpiredError} If the token is expired
 */
export function verifyDeviceToken(token) {
  const decoded = jwt.verify(token, env.JWT_DEVICE_SECRET);
  if (decoded.type !== 'device') {
    const err = new Error('Invalid token type');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
}
