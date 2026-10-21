const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/staff-list', authorize('admin', 'staff'), c.staffList);

router.use(authorize('admin'));

const pw = body('password')
  .isLength({ min: 8, max: 100 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
  .matches(/\d/).withMessage('Password must contain a number');

router.get('/', c.list);
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
    pw,
    body('role').isIn(['patient', 'staff', 'admin']).withMessage('Invalid role'),
    body('department').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid department'),
  ],
  validate,
  c.create
);
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('role').optional().isIn(['patient', 'staff', 'admin']).withMessage('Invalid role'),
    body('department').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid department'),
  ],
  validate,
  c.update
);
router.put('/:id/password', [param('id').isMongoId().withMessage('Invalid user id'), pw], validate, c.resetPassword);

module.exports = router;
