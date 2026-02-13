const mongoose = require('mongoose');
const CoffeeOrder = require('../models/WorkItem');
const CoffeeShop = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectIdEqual } = require('../utils/permissions');

function calculateTotals(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  order.subtotal = Number(subtotal.toFixed(2));

  const discount = Number(order.discountAmount || 0);
  const tax = Number(order.taxAmount || 0);
  const total = Math.max(order.subtotal - discount + tax, 0);
  order.totalAmount = Number(total.toFixed(2));
}

async function ensureOrderableShop(shopId, user) {
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return { error: { status: 400, message: 'Invalid shop id.' } };
  }

  const shop = await CoffeeShop.findById(shopId);
  if (!shop || shop.archived) {
    return { error: { status: 404, message: 'Coffee shop not found.' } };
  }

  if (user.role !== 'admin') {
    if (isObjectIdEqual(shop.owner, user._id)) {
      return { error: { status: 403, message: 'You cannot place orders in your own shop.' } };
    }

    if (shop.status !== 'open') {
      return { error: { status: 403, message: 'Users can only order from open shops.' } };
    }
  }

  return { shop };
}

function canAccessOrder(user, order) {
  if (!user || !order) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return isObjectIdEqual(order.createdBy, user._id) || isObjectIdEqual(order.cashier, user._id);
}

const createOrder = asyncHandler(async (req, res) => {
  const {
    shop: shopId,
    customerName,
    cashier,
    status,
    paymentStatus,
    orderType,
    tableNumber,
    items,
    discountAmount,
    taxAmount,
    currency
  } = req.body;

  const shopAccess = await ensureOrderableShop(shopId, req.user);
  if (shopAccess.error) {
    return res.status(shopAccess.error.status).json({ message: shopAccess.error.message });
  }

  const resolvedCashier = req.user.role === 'admin' && cashier ? cashier : req.user._id;

  const order = await CoffeeOrder.create({
    shop: shopId,
    customerName,
    cashier: resolvedCashier,
    createdBy: req.user._id,
    status: status || 'pending',
    paymentStatus: paymentStatus || 'unpaid',
    orderType: orderType || 'takeaway',
    tableNumber: tableNumber || '',
    items: items || [],
    discountAmount: Number(discountAmount || 0),
    taxAmount: Number(taxAmount || 0),
    currency: currency || 'USD'
  });

  calculateTotals(order);
  await order.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'create_order',
    entityType: 'order',
    entityId: order._id,
    metadata: { shopId, cashier: order.cashier }
  });

  return res.status(201).json(order);
});

const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const query = {};
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin) {
    query.createdBy = req.user._id;
  }

  if (req.query.shop) {
    const shopAccess = await ensureOrderableShop(req.query.shop, req.user);
    if (shopAccess.error) {
      return res.status(shopAccess.error.status).json({ message: shopAccess.error.message });
    }

    query.shop = req.query.shop;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.paymentStatus) {
    query.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.cashier) {
    if (!mongoose.Types.ObjectId.isValid(req.query.cashier)) {
      return res.status(400).json({ message: 'Invalid cashier id.' });
    }

    query.cashier = req.query.cashier;
  }

  if (req.query.search) {
    query.$text = { $search: req.query.search.trim() };
  }

  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    CoffeeOrder.find(query)
      .populate('shop', 'name status location')
      .populate('cashier', 'fullName email')
      .populate('createdBy', 'fullName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    CoffeeOrder.countDocuments(query)
  ]);

  return res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id.' });
  }

  const order = await CoffeeOrder.findById(id)
    .populate('shop', 'name status location archived')
    .populate('cashier', 'fullName email')
    .populate('createdBy', 'fullName email')
    .populate('notes.author', 'fullName email');

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  return res.json(order);
});

const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  const isCreator = isObjectIdEqual(order.createdBy, req.user._id);
  const isCashier = isObjectIdEqual(order.cashier, req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!(isCreator || isCashier || isAdmin)) {
    return res.status(403).json({ message: 'You cannot update this order.' });
  }

  const allowed = [
    'customerName',
    'cashier',
    'status',
    'paymentStatus',
    'orderType',
    'tableNumber',
    'discountAmount',
    'taxAmount',
    'currency'
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      order[field] = req.body[field];
    }
  });

  calculateTotals(order);
  await order.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'update_order',
    entityType: 'order',
    entityId: order._id,
    metadata: req.body
  });

  return res.json(order);
});

const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'You cannot delete this order.' });
  }

  await CoffeeOrder.deleteOne({ _id: order._id });

  await ActivityLog.create({
    actor: req.user._id,
    action: 'delete_order',
    entityType: 'order',
    entityId: order._id,
    metadata: {}
  });

  return res.json({ message: 'Order deleted successfully.' });
});

const addOrderItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { menuItemName, size, quantity, unitPrice, modifiers, itemStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  const item = {
    _id: new mongoose.Types.ObjectId(),
    menuItemName,
    size: size || 'medium',
    quantity: Number(quantity || 1),
    unitPrice: Number(unitPrice),
    modifiers: modifiers || [],
    itemStatus: itemStatus || 'queued',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await CoffeeOrder.updateOne({ _id: id }, { $push: { items: item } });
  const updated = await CoffeeOrder.findById(id);
  calculateTotals(updated);
  await updated.save();

  return res.status(201).json(updated);
});

const updateOrderItemQuantity = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { delta } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  const currentItem = order.items.find((item) => isObjectIdEqual(item._id, itemId));
  if (!currentItem) {
    return res.status(404).json({ message: 'Order item not found.' });
  }

  const nextQuantity = currentItem.quantity + Number(delta);
  if (nextQuantity < 1) {
    return res.status(400).json({ message: 'Resulting quantity must be at least 1.' });
  }

  const updated = await CoffeeOrder.findOneAndUpdate(
    { _id: id, 'items._id': itemId },
    { $inc: { 'items.$.quantity': Number(delta) } },
    { new: true }
  );

  calculateTotals(updated);
  await updated.save();

  return res.json(updated);
});

const updateOrderItemStatus = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { itemStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  const updated = await CoffeeOrder.findOneAndUpdate(
    { _id: id, 'items._id': itemId },
    { $set: { 'items.$.itemStatus': itemStatus } },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: 'Order item not found.' });
  }

  calculateTotals(updated);
  await updated.save();

  return res.json(updated);
});

const removeOrderItem = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  await CoffeeOrder.updateOne({ _id: id }, { $pull: { items: { _id: itemId } } });
  const updated = await CoffeeOrder.findById(id);
  calculateTotals(updated);
  await updated.save();

  return res.json(updated);
});

const addOrderNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  const note = {
    _id: new mongoose.Types.ObjectId(),
    author: req.user._id,
    text,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await CoffeeOrder.updateOne({ _id: id }, { $push: { notes: note } });
  const updated = await CoffeeOrder.findById(id).populate('notes.author', 'fullName email');

  return res.status(201).json(updated);
});

const removeOrderNote = asyncHandler(async (req, res) => {
  const { id, noteId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noteId)) {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  const order = await CoffeeOrder.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (!canAccessOrder(req.user, order)) {
    return res.status(403).json({ message: 'Order access denied.' });
  }

  await CoffeeOrder.updateOne({ _id: id }, { $pull: { notes: { _id: noteId } } });
  const updated = await CoffeeOrder.findById(id);

  return res.json(updated);
});

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  addOrderItem,
  updateOrderItemQuantity,
  updateOrderItemStatus,
  removeOrderItem,
  addOrderNote,
  removeOrderNote
};
