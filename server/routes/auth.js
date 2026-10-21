const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'test' ? 1000 : 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });

const strongPassword = (field = 'password') =>
  body(field)
    .isLength({ min: 8, max: 100 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
    strongPassword(),
    body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9+\-\s]{7,15}$/).withMessage('Enter a valid phone number'),
  ],
  validate,
  c.register
);
router.post(
  '/login',
  authLimiter,
  [body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }), body('password').notEmpty().withMessage('Password is required')],
  validate,
  c.login
);
router.post(
  '/admin-register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
    strongPassword(),
    body('adminKey').notEmpty().withMessage('Admin registration key is required'),
  ],
  validate,
  c.registerAdmin
);
router.post(
  '/admin-login',
  authLimiter,
  [body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }), body('password').notEmpty().withMessage('Password is required')],
  validate,
  c.adminLogin
);
router.post('/forgot-password', authLimiter, [body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false })], validate, c.forgotPassword);
router.post('/reset-password/:token', authLimiter, [strongPassword()], validate, c.resetPassword);

router.get('/me', protect, c.me);
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9+\-\s]{7,15}$/).withMessage('Enter a valid phone number'),
  ],
  validate,
  c.updateProfile
);
router.put('/password', protect, [body('currentPassword').notEmpty().withMessage('Current password is required'), strongPassword('newPassword')], validate, c.changePassword);
router.get('/export', protect, c.exportData);
router.delete('/account', protect, c.deleteAccount);

module.exports = router;