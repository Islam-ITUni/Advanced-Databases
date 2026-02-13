const mongoose = require('mongoose');

const shopStaffSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'barista', 'cashier'],
      default: 'barista'
    }
  },
  { _id: false }
);

const coffeeShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    staff: {
      type: [shopStaffSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'maintenance'],
      default: 'open',
      index: true
    },
    location: {
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
      },
      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
      }
    },
    menuCategories: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    archived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

coffeeShopSchema.index({ owner: 1, createdAt: -1 });
coffeeShopSchema.index({ status: 1, 'location.city': 1 });
coffeeShopSchema.index({ 'staff.user': 1, status: 1 });
coffeeShopSchema.index({ name: 'text', description: 'text', 'location.city': 'text' });

module.exports = mongoose.model('CoffeeShop', coffeeShopSchema);
