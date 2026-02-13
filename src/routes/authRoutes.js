const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

router.post(
  '/register',
  [
    body('fullName').isString().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6, max: 100 })
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()],
  validate,
  authController.login
);

router.get('/me', auth, authController.me);

module.exports = router;
