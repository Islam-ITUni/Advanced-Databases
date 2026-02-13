const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing authentication token.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  const user = await User.findById(payload.sub)
    .select('_id fullName email role createdAt updatedAt')
    .lean();
  if (!user) {
    return res.status(401).json({ message: 'User no longer exists.' });
  }

  req.user = user;
  return next();
});

module.exports = auth;
