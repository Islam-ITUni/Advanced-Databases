const mongoose = require('mongoose');
const CoffeeOrder = require('../models/WorkItem');
const CoffeeShop = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { isShopStaff } = require('../utils/permissions');

const shopSalesSummary = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return res.status(400).json({ message: 'Invalid shop id.' });
  }

  const shop = await CoffeeShop.findById(shopId).lean();
  if (!shop || shop.archived) {
    return res.status(404).json({ message: 'Coffee shop not found.' });
  }

  if (!isShopStaff(req.user, shop)) {
    return res.status(403).json({ message: 'Shop access denied.' });
  }

  const id = new mongoose.Types.ObjectId(shopId);

  const [summary] = await CoffeeOrder.aggregate([
    { $match: { shop: id } },
    {
      $facet: {
        orderStatusBreakdown: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        paymentStatusBreakdown: [
          { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        revenueMetrics: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' },
              averageTicketSize: { $avg: '$totalAmount' },
              paidRevenue: {
                $sum: {
                  $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0]
                }
              }
            }
          }
        ],
        topProducts: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.menuItemName',
              totalQuantity: { $sum: '$items.quantity' },
              totalSales: {
                $sum: {
                  $multiply: ['$items.quantity', '$items.unitPrice']
                }
              }
            }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 }
        ],
        hourlyDemand: [
          {
            $group: {
              _id: { $hour: '$createdAt' },
              orderCount: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);

  return res.json({
    shopId,
    generatedAt: new Date().toISOString(),
    summary: summary || {}
  });
});

const staffPerformance = asyncHandler(async (req, res) => {
  const shopIds = await CoffeeShop.find({
    archived: false,
    $or: [{ owner: req.user._id }, { 'staff.user': req.user._id }]
  })
    .select('_id')
    .lean();

  const idList = shopIds.map((item) => item._id);

  const stats = await CoffeeOrder.aggregate([
    { $match: { shop: { $in: idList } } },
    {
      $group: {
        _id: { cashierId: '$cashier', status: '$status' },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    {
      $group: {
        _id: '$_id.cashierId',
        statusStats: {
          $push: {
            status: '$_id.status',
            count: '$orderCount'
          }
        },
        totalOrders: { $sum: '$orderCount' },
        totalRevenue: { $sum: '$totalRevenue' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$user._id',
        fullName: '$user.fullName',
        email: '$user.email',
        totalOrders: 1,
        totalRevenue: 1,
        statusStats: 1
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);

  return res.json({
    generatedAt: new Date().toISOString(),
    staff: stats
  });
});

module.exports = {
  shopSalesSummary,
  staffPerformance
};
