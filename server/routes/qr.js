const router = require('express').Router();
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'staff'));

// GET /api/qr?department=<id>  (omit department for a hospital-wide QR)
router.get('/', asyncHandler(async (req, res) => {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  let url = `${base}/feedback/public`;
  let label = 'Hospital-wide feedback';
  if (req.query.department) {
    if (!mongoose.Types.ObjectId.isValid(req.query.department)) return res.status(400).json({ message: 'Invalid department' });
    const dept = await Department.findById(req.query.department);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    url += `?dept=${dept._id}`;
    label = dept.name;
  }
  const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } });
  res.json({ url, label, dataUrl });
}));

module.exports = router;
