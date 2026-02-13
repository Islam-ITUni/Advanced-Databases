const { Router } = require('express');
const { body, param, query } = require('express-validator');
const shopController = require('../controllers/projectController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const router = Router();

router.use(auth);

router.post(
  '/',
  [
    body('name').isString().isLength({ min: 3, max: 160 }),
    body('description').isString().isLength({ min: 10, max: 2000 }),
    body('city').isString().isLength({ min: 2, max: 120 }),
    body('address').isString().isLength({ min: 5, max: 300 }),
    body('status').optional().isIn(['open', 'closed', 'maintenance']),
    body('menuCategories').optional().isArray(),
    body('tags').optional().isArray()
  ],
  validate,
  shopController.createShop
);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['open', 'closed', 'maintenance']),
    query('includeArchived').optional().isBoolean().toBoolean(),
    query('archived').optional().isBoolean().toBoolean()
  ],
  validate,
  shopController.listShops
);

router.get('/:id', [param('id').isMongoId()], validate, shopController.getShop);

router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('name').optional().isString().isLength({ min: 3, max: 160 }),
    body('description').optional().isString().isLength({ min: 10, max: 2000 }),
    body('city').optional().isString().isLength({ min: 2, max: 120 }),
    body('address').optional().isString().isLength({ min: 5, max: 300 }),
    body('status').optional().isIn(['open', 'closed', 'maintenance']),
    body('menuCategories').optional().isArray(),
    body('tags').optional().isArray(),
    body('archived').optional().isBoolean()
  ],
  validate,
  shopController.updateShop
);

router.delete('/:id', [param('id').isMongoId()], authorize('admin'), validate, shopController.deleteShop);

router.post(
  '/:id/staff',
  [
    param('id').isMongoId(),
    body('userId').isMongoId(),
    body('role').optional().isIn(['owner', 'manager', 'barista', 'cashier'])
  ],
  validate,
  shopController.addStaff
);

router.delete(
  '/:id/staff/:userId',
  [param('id').isMongoId(), param('userId').isMongoId()],
  validate,
  shopController.removeStaff
);

module.exports = router;
