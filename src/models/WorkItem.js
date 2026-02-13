const mongoose = require('mongoose');

const orderNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800
    }
  },
  { timestamps: true }
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    modifiers: {
      type: [String],
      default: []
    },
    itemStatus: {
      type: String,
      enum: ['queued', 'in_preparation', 'ready', 'served'],
      default: 'queued'
    }
  },
  { timestamps: true }
);

const coffeeOrderSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoffeeShop',
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'served', 'cancelled'],
      default: 'pending',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true
    },
    orderType: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery'],
      default: 'takeaway'
    },
    tableNumber: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ''
    },
    notes: {
      type: [orderNoteSchema],
      default: []
    },
    items: {
      type: [orderItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
      index: true
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 10
    }
  },
  { timestamps: true }
);

coffeeOrderSchema.index({ shop: 1, status: 1, createdAt: -1 });
coffeeOrderSchema.index({ cashier: 1, paymentStatus: 1, createdAt: -1 });
coffeeOrderSchema.index({ customerName: 'text', 'items.menuItemName': 'text' });

module.exports = mongoose.model('CoffeeOrder', coffeeOrderSchema);
