const router = require('express').Router();
const { param } = require('express-validator');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getPaging } = require('../utils/helpers');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;
  const { page, limit, skip } = getPaging(req.query, 20);
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ items, total, unread, page, pages: Math.ceil(total / limit) || 1 });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, read: false }) });
}));

router.put('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
}));

router.put('/:id/read', [param('id').isMongoId()], validate, asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification: n });
}));

router.delete('/:id', [param('id').isMongoId()], validate, asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
