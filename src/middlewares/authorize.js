function authorize(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (roles.length === 0 || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: 'Insufficient permissions.' });
  };
}

module.exports = authorize;
