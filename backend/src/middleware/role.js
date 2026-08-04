/**
 * Express middleware factory to restrict access based on user role.
 * Must be used after authMiddleware.
 * 
 * @param {...string} roles - The allowed roles (e.g. 'tecnico', 'preparador', 'atleta')
 * @returns {Function} Express middleware function
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient role',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient role',
      });
    }

    return next();
  };
}
