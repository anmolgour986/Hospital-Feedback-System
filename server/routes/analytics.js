const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/patient', authorize('patient'), c.patient);
router.get('/me', authorize('staff'), c.me);
router.get('/overview', authorize('admin', 'staff'), c.overview);
router.get('/trends', authorize('admin', 'staff'), c.trends);
router.get('/departments', authorize('admin', 'staff'), c.departments);
router.get('/staff', authorize('admin', 'staff'), c.staff);

module.exports = router;
