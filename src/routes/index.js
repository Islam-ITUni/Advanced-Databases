const { Router } = require('express');
const authRoutes = require('./authRoutes');
const shopRoutes = require('./projectRoutes');
const orderRoutes = require('./workItemRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const userRoutes = require('./userRoutes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'coffee-shop-management-api',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/shops', shopRoutes);
router.use('/orders', orderRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', userRoutes);

module.exports = router;
