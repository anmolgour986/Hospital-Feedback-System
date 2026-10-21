const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const { getPaging } = require('../utils/helpers');

router.use(protect, authorize('admin'));

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  const { page, limit, skip } = getPaging(req.query, 20);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
}));

module.exports = router;
