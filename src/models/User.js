const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      index: true
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(rawPassword) {
  return bcrypt.compare(rawPassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(rawPassword) {
  const saltRounds = 10;
  return bcrypt.hash(rawPassword, saltRounds);
};

module.exports = mongoose.model('User', userSchema);
