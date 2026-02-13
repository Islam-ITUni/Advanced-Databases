const { Router } = require('express');
const { param } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const router = Router();

router.use(auth);
router.use(authorize('admin'));

router.get('/shops/:shopId/summary', [param('shopId').isMongoId()], validate, analyticsController.shopSalesSummary);
router.get('/staff/performance', analyticsController.staffPerformance);

module.exports = router;
