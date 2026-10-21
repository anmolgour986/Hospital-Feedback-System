const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { complaintRules } = require('../middleware/rules');
const { PRIORITIES, COMPLAINT_STATUSES } = require('../utils/constants');

const idRule = param('id').isMongoId().withMessage('Invalid complaint id');

router.use(protect);

router.get('/', c.list);
router.post('/', authorize('patient'), complaintRules, validate, c.create);
router.post('/escalate/run', authorize('admin'), c.runEscalationNow);

router.get('/:id', [idRule], validate, c.get);
router.put('/:id/assign', authorize('admin'), [idRule, body('staffId').isMongoId().withMessage('Select a staff member')], validate, c.assign);
router.put('/:id/claim', authorize('staff'), [idRule], validate, c.claim);
router.put('/:id/status', [idRule, body('status').isIn(COMPLAINT_STATUSES).withMessage('Invalid status'), body('note').optional({ checkFalsy: true }).isString().isLength({ max: 500 })], validate, c.setStatus);
router.put('/:id/priority', authorize('admin', 'staff'), [idRule, body('priority').isIn(PRIORITIES).withMessage('Invalid priority')], validate, c.setPriority);
router.post('/:id/respond', [idRule, body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters')], validate, c.respond);
router.put('/:id/rate', authorize('patient'), [idRule, body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'), body('feedback').optional({ checkFalsy: true }).isString().isLength({ max: 500 })], validate, c.rateResolution);
router.delete('/:id', authorize('admin'), [idRule], validate, c.remove);

module.exports = router;
