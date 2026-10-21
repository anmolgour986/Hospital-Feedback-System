const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/', c.list);

router.use(authorize('admin'));
const nameRule = body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Department name must be 2-80 characters');
router.post('/', [nameRule, body('head').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid head')], validate, c.create);
router.put('/:id', [param('id').isMongoId().withMessage('Invalid id'), body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Department name must be 2-80 characters')], validate, c.update);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid id')], validate, c.remove);

module.exports = router;
