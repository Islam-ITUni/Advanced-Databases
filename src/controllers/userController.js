const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('fullName email role createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return res.json(users);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { role } },
    { new: true, runValidators: true }
  ).select('fullName email role');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json(user);
});

module.exports = {
  listUsers,
  updateUserRole
};
