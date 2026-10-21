const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, getPaging } = require('../utils/helpers');
const { audit } = require('../utils/audit');
const { sendEmail } = require('../utils/mailer');

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.list = asyncHandler(async (req, res) => {
  const { role, q, department, active } = req.query;
  const filter = {};
  if (['patient', 'staff', 'admin'].includes(role)) filter.role = role;
  if (department && validId(department)) filter.department = department;
  if (active === 'true' || active === 'false') filter.isActive = active === 'true';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const { page, limit, skip } = getPaging(req.query, 12);
  const [items, total] = await Promise.all([
    User.find(filter).populate('department', 'name').sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// Active staff for assignment drop-downs
exports.staffList = asyncHandler(async (req, res) => {
  const filter = { role: 'staff', isActive: true };
  if (req.query.department && validId(req.query.department)) filter.department = req.query.department;
  const items = await User.find(filter).select('name designation isDoctor department').populate('department', 'name').sort('name');
  res.json({ items });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, designation, isDoctor, phone } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({
    name, email, password, role, phone, designation,
    department: department && validId(department) ? department : null,
    isDoctor: !!isDoctor,
  });
  audit(req, 'USER_CREATED', req.user, { target: user.email, role: user.role });
  sendEmail({ to: user.email, subject: 'Your hospital system account', text: `Hello ${user.name},\n\nAn account (${user.role}) has been created for you. Please log in with your email and the temporary password shared by the administrator, then change it.` });
  await user.populate('department', 'name');
  res.status(201).json({ user });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const self = String(user._id) === String(req.user._id);
  const { name, role, department, designation, isDoctor, phone, isActive } = req.body;
  if (self && ((role && role !== user.role) || isActive === false)) {
    return res.status(400).json({ message: 'You cannot change your own role or deactivate yourself' });
  }
  if (name !== undefined) user.name = name;
  if (role) user.role = role;
  if (department !== undefined) user.department = department && validId(department) ? department : null;
  if (designation !== undefined) user.designation = designation;
  if (isDoctor !== undefined) user.isDoctor = !!isDoctor;
  if (phone !== undefined) user.phone = phone;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  await user.save();
  audit(req, 'USER_UPDATED', req.user, { target: user.email });
  await user.populate('department', 'name');
  res.json({ user });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.password = req.body.password;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  audit(req, 'USER_PASSWORD_RESET_BY_ADMIN', req.user, { target: user.email });
  res.json({ message: 'Password updated' });
});
