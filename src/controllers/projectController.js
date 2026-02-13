const mongoose = require('mongoose');
const CoffeeShop = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { canManageShop, isObjectIdEqual } = require('../utils/permissions');

const createShop = asyncHandler(async (req, res) => {
  const { name, description, status, city, address, menuCategories, tags } = req.body;

  const shop = await CoffeeShop.create({
    name,
    description,
    status: status || 'open',
    location: { city, address },
    menuCategories: menuCategories || [],
    tags: tags || [],
    owner: req.user._id,
    staff: [{ user: req.user._id, role: 'owner' }]
  });

  await ActivityLog.create({
    actor: req.user._id,
    action: 'create_shop',
    entityType: 'shop',
    entityId: shop._id,
    metadata: { name: shop.name, city: shop.location.city }
  });

  return res.status(201).json(shop);
});

const listShops = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const search = (req.query.search || '').trim();
  const status = req.query.status;
  const city = req.query.city;

  const filter = {};

  if (req.user.role !== 'admin') {
    filter.archived = false;
  } else {
    const hasArchivedFilter = req.query.archived !== undefined;
    if (hasArchivedFilter) {
      filter.archived = req.query.archived;
    } else if (!req.query.includeArchived) {
      filter.archived = false;
    }
  }

  if (status) {
    filter.status = status;
  }

  if (city) {
    filter['location.city'] = city;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const [items, total] = await Promise.all([
    CoffeeShop.find(filter)
      .populate('owner', 'fullName email role')
      .populate('staff.user', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CoffeeShop.countDocuments(filter)
  ]);

  return res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items
  });
});

const getShop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid shop id.' });
  }

  const shop = await CoffeeShop.findById(id)
    .populate('owner', 'fullName email role')
    .populate('staff.user', 'fullName email role');

  if (!shop) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (req.user.role !== 'admin' && shop.archived) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (req.user.role !== 'admin' && shop.status !== 'open') {
    return res.status(403).json({ message: 'Users can only access open shops.' });
  }

  return res.json(shop);
});

const updateShop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid shop id.' });
  }

  const shop = await CoffeeShop.findById(id);
  if (!shop) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (!canManageShop(req.user, shop)) {
    return res.status(403).json({ message: 'Only shop owner or admin can update this shop.' });
  }

  if (req.body.archived !== undefined && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can archive or restore shops.' });
  }

  const allowed = ['name', 'description', 'status', 'menuCategories', 'tags'];
  if (req.user.role === 'admin') {
    allowed.push('archived');
  }
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      shop[key] = req.body[key];
    }
  });

  if (req.body.city !== undefined) {
    shop.location.city = req.body.city;
  }

  if (req.body.address !== undefined) {
    shop.location.address = req.body.address;
  }

  await shop.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'update_shop',
    entityType: 'shop',
    entityId: shop._id,
    metadata: req.body
  });

  return res.json(shop);
});

const deleteShop = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can archive shops.' });
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid shop id.' });
  }

  const shop = await CoffeeShop.findById(id);
  if (!shop) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (shop.archived) {
    return res.status(400).json({ message: 'Coffee shop is already archived.' });
  }

  shop.archived = true;
  await shop.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'archive_shop',
    entityType: 'shop',
    entityId: shop._id,
    metadata: {}
  });

  return res.json({ message: 'Coffee shop archived successfully.' });
});

const addStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  const [shop, user] = await Promise.all([
    CoffeeShop.findById(id),
    User.findById(userId).lean()
  ]);

  if (!shop || shop.archived) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (!canManageShop(req.user, shop)) {
    return res.status(403).json({ message: 'Only shop owner or admin can manage staff.' });
  }

  const alreadyStaff = shop.staff.some((member) => isObjectIdEqual(member.user, userId));
  if (alreadyStaff) {
    return res.status(409).json({ message: 'User is already part of this shop.' });
  }

  shop.staff.push({ user: userId, role: role || 'barista' });
  await shop.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'add_shop_staff',
    entityType: 'shop',
    entityId: shop._id,
    metadata: { userId, role: role || 'barista' }
  });

  return res.status(201).json(shop);
});

const removeStaff = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid id.' });
  }

  const shop = await CoffeeShop.findById(id);
  if (!shop || shop.archived) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (!canManageShop(req.user, shop)) {
    return res.status(403).json({ message: 'Only shop owner or admin can manage staff.' });
  }

  if (isObjectIdEqual(shop.owner, userId)) {
    return res.status(400).json({ message: 'Shop owner cannot be removed from staff.' });
  }

  shop.staff = shop.staff.filter((member) => !isObjectIdEqual(member.user, userId));
  await shop.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'remove_shop_staff',
    entityType: 'shop',
    entityId: shop._id,
    metadata: { userId }
  });

  return res.json(shop);
});

module.exports = {
  createShop,
  listShops,
  getShop,
  updateShop,
  deleteShop,
  addStaff,
  removeStaff
};
