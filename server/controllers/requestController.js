const ServiceRequest = require('../models/ServiceRequest');
const Department = require('../models/Department');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser, notifyRole } = require('../utils/notify');
const { getPaging, dateRange } = require('../utils/helpers');
const { REQUEST_STATUSES, REQUEST_TYPES, PRIORITIES } = require('../utils/constants');

const POPULATE = [
  { path: 'department', select: 'name' },
  { path: 'assignedTo', select: 'name designation' },
  { path: 'patient', select: 'name phone' },
];
const ACTIVE = ['Pending', 'Accepted', 'In Progress'];
const idOf = (v) => String(v && v._id ? v._id : v);

function scopeFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'patient') return { patient: user._id };
  const or = [{ assignedTo: user._id }];
  if (user.department) or.push({ department: user.department });
  return { $or: or };
}

function canAccess(r, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'patient') return idOf(r.patient) === idOf(user._id);
  return (r.assignedTo && idOf(r.assignedTo) === idOf(user._id)) || (user.department && r.department && idOf(r.department) === idOf(user.department));
}

const addTimeline = (r, user, status, note) => r.timeline.push({ status, by: user._id, byName: user.name, note, at: new Date() });

async function load(req, res) {
  const r = await ServiceRequest.findById(req.params.id);
  if (!r) { res.status(404).json({ message: 'Request not found' }); return null; }
  if (!canAccess(r, req.user)) { res.status(403).json({ message: 'You do not have access to this request' }); return null; }
  return r;
}

const out = async (r) => { await r.populate(POPULATE); return r; };

exports.create = asyncHandler(async (req, res) => {
  const { type, department, location, description, priority } = req.body;
  let dept = null;
  if (department) {
    dept = await Department.findOne({ _id: department, isActive: true });
    if (!dept) return res.status(400).json({ message: 'Selected department is not available' });
  }
  const r = new ServiceRequest({
    patient: req.user._id, type, department: dept ? dept._id : null, location, description,
    priority: PRIORITIES.includes(priority) ? priority : 'Medium',
  });
  addTimeline(r, req.user, 'Pending', 'Request submitted');
  await r.save();
  const msg = `${r.requestId} · ${type}${location ? ` · ${location}` : ''}`;
  const level = ['High', 'Urgent'].includes(r.priority) ? 'danger' : 'info';
  if (dept) notifyRole('staff', { title: 'New service request', message: msg, type: level, link: '/requests' }, { department: dept._id });
  notifyRole('admin', { title: 'New service request', message: msg, type: level, link: '/requests' });
  notifyUser(req.user._id, { title: 'Service request received', message: `${r.requestId} (${type}) has been submitted. You can track its status.`, type: 'success', link: '/requests', email: true });
  res.status(201).json({ request: await out(r) });
});

exports.list = asyncHandler(async (req, res) => {
  const { status, type, department, priority, assignedTo, mine } = req.query;
  const and = [scopeFilter(req.user)];
  if (REQUEST_STATUSES.includes(status)) and.push({ status });
  if (status === 'active') and.push({ status: { $in: ACTIVE } });
  if (REQUEST_TYPES.includes(type)) and.push({ type });
  if (PRIORITIES.includes(priority)) and.push({ priority });
  if (department) and.push({ department });
  if (assignedTo === 'none') and.push({ assignedTo: null });
  if (mine === 'true') and.push({ assignedTo: req.user._id });
  const dr = dateRange(req.query);
  if (dr.createdAt) and.push(dr);
  const { page, limit, skip } = getPaging(req.query, 10);
  const filter = { $and: and };
  const [items, total] = await Promise.all([
    ServiceRequest.find(filter).populate(POPULATE).sort('-createdAt').skip(skip).limit(limit),
    ServiceRequest.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.get = asyncHandler(async (req, res) => {
  const r = await load(req, res);
  if (!r) return;
  res.json({ request: await out(r) });
});

exports.assign = asyncHandler(async (req, res) => {
  const r = await load(req, res);
  if (!r) return;
  if (!ACTIVE.includes(r.status)) return res.status(400).json({ message: 'This request is already finished' });
  const staff = await User.findOne({ _id: req.body.staffId, role: 'staff', isActive: true });
  if (!staff) return res.status(400).json({ message: 'Selected staff member is not available' });
  r.assignedTo = staff._id;
  addTimeline(r, req.user, r.status, `Assigned to ${staff.name}`);
  await r.save();
  notifyUser(staff._id, { title: 'Service request assigned', message: `${r.requestId} · ${r.type}`, type: 'warning', link: '/requests', email: true });
  notifyUser(r.patient, { title: 'Service request update', message: `${r.requestId} is assigned to ${staff.name}.`, type: 'info', link: '/requests' });
  res.json({ request: await out(r) });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const r = await load(req, res);
  if (!r) return;
  const { status, note } = req.body;
  const user = req.user;
  if (r.status === status) return res.status(400).json({ message: `Request is already ${status}` });
  if (!ACTIVE.includes(r.status)) return res.status(400).json({ message: `Request is already ${r.status}` });

  if (user.role === 'patient') {
    if (status !== 'Cancelled' || r.status === 'In Progress') return res.status(403).json({ message: 'You can only cancel a request that has not started' });
  } else if (user.role === 'staff') {
    if (r.assignedTo && idOf(r.assignedTo) !== idOf(user._id)) return res.status(403).json({ message: 'This request is assigned to another staff member' });
    if (!r.assignedTo) r.assignedTo = user._id; // taking an unassigned request makes you the owner
  }
  r.status = status;
  if (status === 'Completed') r.completedAt = new Date();
  addTimeline(r, user, status, note);
  await r.save();

  if (user.role === 'patient') {
    if (r.assignedTo) notifyUser(r.assignedTo, { title: 'Request cancelled by patient', message: `${r.requestId} · ${r.type}`, type: 'warning', link: '/requests' });
  } else {
    notifyUser(r.patient, {
      title: `Service request ${status}`, message: `${r.requestId} · ${r.type} is now ${status}.`,
      type: status === 'Completed' ? 'success' : status === 'Cancelled' ? 'warning' : 'info', link: '/requests', email: status === 'Completed',
    });
  }
  res.json({ request: await out(r) });
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await ServiceRequest.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ message: 'Request not found' });
  res.json({ message: 'Request deleted' });
});
