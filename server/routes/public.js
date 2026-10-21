const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const Department = require('../models/Department');
const User = require('../models/User');
const { createPublic } = require('../controllers/feedbackController');
const validate = require('../middleware/validate');
const { feedbackRules } = require('../middleware/rules');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many submissions from this device. Please try later.' } });

// Departments + doctors/staff (no contact details) for the public QR feedback form and rating forms
router.get('/directory', asyncHandler(async (req, res) => {
  const [departments, staff] = await Promise.all([
    Department.find({ isActive: true }).select('name').sort('name'),
    User.find({ role: 'staff', isActive: true }).select('name designation isDoctor department').sort('name'),
  ]);
  res.json({ departments, staff });
}));

router.post('/feedback', limiter, feedbackRules, validate, createPublic);

module.exports = router;
