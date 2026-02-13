const { Router } = require('express');
const { body, param, query } = require('express-validator');
const orderController = require('../controllers/workItemController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

router.use(auth);

router.post(
  '/',
  [
    body('shop').isMongoId(),
    body('customerName').isString().isLength({ min: 2, max: 120 }),
    body('cashier').optional().isMongoId(),
    body('status').optional().isIn(['pending', 'preparing', 'served', 'cancelled']),
    body('paymentStatus').optional().isIn(['unpaid', 'paid', 'refunded']),
    body('orderType').optional().isIn(['dine_in', 'takeaway', 'delivery']),
    body('tableNumber').optional().isString().isLength({ max: 20 }),
    body('items').optional().isArray(),
    body('discountAmount').optional().isFloat({ min: 0 }),
    body('taxAmount').optional().isFloat({ min: 0 }),
    body('currency').optional().isString().isLength({ min: 3, max: 10 })
  ],
  validate,
  orderController.createOrder
);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('shop').optional().isMongoId(),
    query('cashier').optional().isMongoId(),
    query('status').optional().isIn(['pending', 'preparing', 'served', 'cancelled']),
    query('paymentStatus').optional().isIn(['unpaid', 'paid', 'refunded'])
  ],
  validate,
  orderController.listOrders
);

router.get('/:id', [param('id').isMongoId()], validate, orderController.getOrder);

router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('customerName').optional().isString().isLength({ min: 2, max: 120 }),
    body('cashier').optional().isMongoId(),
    body('status').optional().isIn(['pending', 'preparing', 'served', 'cancelled']),
    body('paymentStatus').optional().isIn(['unpaid', 'paid', 'refunded']),
    body('orderType').optional().isIn(['dine_in', 'takeaway', 'delivery']),
    body('tableNumber').optional().isString().isLength({ max: 20 }),
    body('discountAmount').optional().isFloat({ min: 0 }),
    body('taxAmount').optional().isFloat({ min: 0 }),
    body('currency').optional().isString().isLength({ min: 3, max: 10 })
  ],
  validate,
  orderController.updateOrder
);

router.delete('/:id', [param('id').isMongoId()], validate, orderController.deleteOrder);

router.post(
  '/:id/items',
  [
    param('id').isMongoId(),
    body('menuItemName').isString().isLength({ min: 2, max: 120 }),
    body('size').optional().isIn(['small', 'medium', 'large']),
    body('quantity').optional().isInt({ min: 1 }),
    body('unitPrice').isFloat({ min: 0 }),
    body('modifiers').optional().isArray(),
    body('itemStatus').optional().isIn(['queued', 'in_preparation', 'ready', 'served'])
  ],
  validate,
  orderController.addOrderItem
);

router.patch(
  '/:id/items/:itemId/quantity',
  [param('id').isMongoId(), param('itemId').isMongoId(), body('delta').isInt({ min: -20, max: 20 }).custom((v) => Number(v) !== 0)],
  validate,
  orderController.updateOrderItemQuantity
);

router.patch(
  '/:id/items/:itemId/status',
  [
    param('id').isMongoId(),
    param('itemId').isMongoId(),
    body('itemStatus').isIn(['queued', 'in_preparation', 'ready', 'served'])
  ],
  validate,
  orderController.updateOrderItemStatus
);

router.delete(
  '/:id/items/:itemId',
  [param('id').isMongoId(), param('itemId').isMongoId()],
  validate,
  orderController.removeOrderItem
);

router.post(
  '/:id/notes',
  [param('id').isMongoId(), body('text').isString().isLength({ min: 1, max: 800 })],
  validate,
  orderController.addOrderNote
);

router.delete(
  '/:id/notes/:noteId',
  [param('id').isMongoId(), param('noteId').isMongoId()],
  validate,
  orderController.removeOrderNote
);

module.exports = router;
