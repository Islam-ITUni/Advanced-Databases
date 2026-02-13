const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

function signToken(userId, role) {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, adminKey } = req.body;

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return res.status(409).json({ message: 'Email already in use.' });
  }

  const role = adminKey && adminKey === env.ADMIN_REGISTRATION_KEY ? 'admin' : 'user';
  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    fullName,
    email,
    passwordHash,
    role
  });

  const token = signToken(user._id, user.role);
  return res.status(201).json({
    message: 'User registered successfully.',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const validPassword = await user.comparePassword(password);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = signToken(user._id, user.role);
  return res.json({
    message: 'Login successful.',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
});

const me = asyncHandler(async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = {
  register,
  login,
  me
};
