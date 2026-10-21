const Department = require('../models/Department');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../utils/audit');

exports.list = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : { isActive: true };
  const items = await Department.find(filter).populate('head', 'name').sort('name');
  res.json({ items });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, description, head } = req.body;
  const dept = await Department.create({ name, description, head: head || null });
  audit(req, 'DEPARTMENT_CREATED', req.user, { name });
  res.status(201).json({ department: dept });
});

exports.update = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ message: 'Department not found' });
  const { name, description, head, isActive } = req.body;
  if (name !== undefined) dept.name = name;
  if (description !== undefined) dept.description = description;
  if (head !== undefined) dept.head = head || null;
  if (typeof isActive === 'boolean') dept.isActive = isActive;
  await dept.save();
  audit(req, 'DEPARTMENT_UPDATED', req.user, { name: dept.name });
  res.json({ department: dept });
});

// Deletes unused departments; deactivates those that already hold data
exports.remove = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ message: 'Department not found' });
  const [u, f, c] = await Promise.all([
    User.exists({ department: dept._id }),
    Feedback.exists({ department: dept._id }),
    Complaint.exists({ department: dept._id }),
  ]);
  audit(req, 'DEPARTMENT_REMOVED', req.user, { name: dept.name });
  if (u || f || c) {
    dept.isActive = false;
    await dept.save();
    return res.json({ message: 'Department has linked data, so it was deactivated instead of deleted', department: dept });
  }
  await dept.deleteOne();
  res.json({ message: 'Department deleted' });
});
