import { verifyUserToken, verifyDeviceToken } from '../utils/jwt.js';

/**
 * Express middleware to authenticate requests using JWT Bearer tokens.
 * Extracts the token, tries to verify it as a user token, and if it fails due to
 * invalid type or expiration, falls back to verifying it as a device token.
 * Populates req.user or req.device on success.
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or malformed Authorization header',
    });
  }

  try {
    const decodedUser = verifyUserToken(token);
    req.user = {
      sub: decodedUser.sub,
      role: decodedUser.role,
    };
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      try {
        const decodedDevice = verifyDeviceToken(token);
        req.device = {
          sub: decodedDevice.sub,
        };
        return next();
      } catch {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid or expired token',
        });
      }
    }
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Express middleware that restricts a route to device tokens only.
 * Must be used AFTER authMiddleware.
 * Returns 401 if req.device is not populated (i.e. a user token was used).
 */
export function requireDevice(req, res, next) {
  if (!req.device) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'This route requires a device token',
    });
  }
  return next();
}
