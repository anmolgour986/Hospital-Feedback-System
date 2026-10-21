const router = require('express').Router();
const { param } = require('express-validator');
const c = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { feedbackRules } = require('../middleware/rules');

router.use(protect);
router.get('/', c.list);
router.post('/', authorize('patient'), feedbackRules, validate, c.create);
router.delete('/:id', authorize('admin'), [param('id').isMongoId().withMessage('Invalid id')], validate, c.remove);

module.exports = router;
