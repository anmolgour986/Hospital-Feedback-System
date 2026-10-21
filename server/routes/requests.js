const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { requestRules } = require('../middleware/rules');
const { REQUEST_STATUSES } = require('../utils/constants');

const idRule = param('id').isMongoId().withMessage('Invalid request id');

router.use(protect);
router.get('/', c.list);
router.post('/', authorize('patient'), requestRules, validate, c.create);
router.get('/:id', [idRule], validate, c.get);
router.put('/:id/assign', authorize('admin'), [idRule, body('staffId').isMongoId().withMessage('Select a staff member')], validate, c.assign);
router.put('/:id/status', [idRule, body('status').isIn(REQUEST_STATUSES).withMessage('Invalid status'), body('note').optional({ checkFalsy: true }).isString().isLength({ max: 500 })], validate, c.setStatus);
router.delete('/:id', authorize('admin'), [idRule], validate, c.remove);

module.exports = router;
