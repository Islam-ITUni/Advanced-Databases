const { Router } = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const router = Router();

router.use(auth);
router.use(authorize('admin'));

router.get('/', userController.listUsers);
router.patch(
  '/:id/role',
  [param('id').isMongoId(), body('role').isIn(['admin', 'user'])],
  validate,
  userController.updateUserRole
);

module.exports = router;
