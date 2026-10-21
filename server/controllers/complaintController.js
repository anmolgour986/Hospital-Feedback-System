const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { analyzeSentiment } = require('../utils/sentiment');
const { categorize, detectUrgency } = require('../utils/categorize');
const { notifyUser, notifyRole } = require('../utils/notify');
const { escapeRegex, getPaging, dateRange, slaDue, hoursBetween } = require('../utils/helpers');
const { PRIORITIES, CATEGORIES, COMPLAINT_STATUSES, OPEN_STATUSES } = require('../utils/constants');
const { audit } = require('../utils/audit');
const { runEscalation } = require('../jobs/escalation');

const POPULATE = [
  { path: 'department', select: 'name' },
  { path: 'assignedTo', select: 'name designation isDoctor' },
  { path: 'patient', select: 'name' },
];

const idOf = (v) => String(v && v._id ? v._id : v);

function scopeFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'patient') return { patient: user._id };
  const or = [{ assignedTo: user._id }];
  if (user.department) or.push({ department: user.department });
  return { $or: or };
}

function canAccess(c, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'patient') return idOf(c.patient) === idOf(user._id);
  return idOf(c.assignedTo) === idOf(user._id) || (user.department && idOf(c.department) === idOf(user.department));
}

const isAssignedTo = (c, user) => c.assignedTo && idOf(c.assignedTo) === idOf(user._id);
const canManage = (c, user) => user.role === 'admin' || (user.role === 'staff' && isAssignedTo(c, user));

// Hide anonymous identity (including name traces in replies / timeline) and internal notes
function shape(doc, user) {
  const o = doc.toObject ? doc.toObject() : doc;
  const pid = o.patient ? idOf(o.patient) : null;
  const owner = pid && pid === idOf(user._id);
  if (o.isAnonymous && !owner) {
    o.patient = null;
    o.responses = (o.responses || []).map((r) => (r.authorRole === 'patient' ? { ...r, author: null, authorName: 'Anonymous patient' } : r));
    o.timeline = (o.timeline || []).map((t) => (t.by && pid && idOf(t.by) === pid ? { ...t, by: null, byName: 'Anonymous patient' } : t));
  }
  if (user.role === 'patient') o.responses = (o.responses || []).filter((r) => !r.internal);
  return o;
}

const addTimeline = (c, user, action, note) =>
  c.timeline.push({ action, by: user._id, byName: user.name, note, at: new Date() });

async function load(req, res) {
  const c = await Complaint.findById(req.params.id);
  if (!c) {
    res.status(404).json({ message: 'Complaint not found' });
    return null;
  }
  if (!canAccess(c, req.user)) {
    res.status(403).json({ message: 'You do not have access to this complaint' });
    return null;
  }
  return c;
}

const respond = async (c, user) => {
  await c.populate(POPULATE);
  return shape(c, user);
};

exports.create = asyncHandler(async (req, res) => {
  const { department, title, description, priority, isAnonymous } = req.body;
  const dept = await Department.findOne({ _id: department, isActive: true });
  if (!dept) return res.status(400).json({ message: 'Selected department is not available' });

  const text = `${title}. ${description}`;
  const category = req.body.category && CATEGORIES.includes(req.body.category) ? req.body.category : categorize(text);
  let prio = PRIORITIES.includes(priority) ? priority : 'Medium';
  const urgency = detectUrgency(text);
  let autoNote = '';
  if (urgency === 2 && prio !== 'Urgent') { prio = 'Urgent'; autoNote = 'Priority raised to Urgent automatically (emergency keywords detected)'; }
  else if (urgency === 1 && PRIORITIES.indexOf(prio) < 2) { prio = 'High'; autoNote = 'Priority raised to High automatically (urgent keywords detected)'; }

  const sentiment = analyzeSentiment(text);
  const c = new Complaint({
    patient: req.user._id, department: dept._id, title, description, category, priority: prio,
    isAnonymous: !!isAnonymous, sentiment, dueAt: slaDue(prio),
  });
  addTimeline(c, req.user, 'Complaint registered', `Category detected: ${category}`);
  if (autoNote) addTimeline(c, { _id: null, name: 'System' }, 'Priority adjusted', autoNote);
  await c.save();

  const level = prio === 'Urgent' || prio === 'High' ? 'danger' : 'warning';
  notifyRole('admin', { title: `New ${prio} complaint`, message: `${c.ticketId} · ${dept.name} · ${title}`, type: level, link: `/complaints/${c._id}`, email: false });
  notifyRole('staff', { title: `New complaint in ${dept.name}`, message: `${c.ticketId} · ${title}`, type: level, link: `/complaints/${c._id}` }, { department: dept._id });
  notifyUser(req.user._id, { title: 'Complaint registered', message: `Your complaint ${c.ticketId} has been received. Priority: ${prio}.`, type: 'success', link: `/complaints/${c._id}`, email: true });

  res.status(201).json({ complaint: await respond(c, req.user) });
});

exports.list = asyncHandler(async (req, res) => {
  const { status, priority, category, department, assignedTo, q, escalated, mine, overdue, sort } = req.query;
  const and = [scopeFilter(req.user)];
  if (COMPLAINT_STATUSES.includes(status)) and.push({ status });
  if (status === 'active') and.push({ status: { $in: OPEN_STATUSES } });
  if (PRIORITIES.includes(priority)) and.push({ priority });
  if (CATEGORIES.includes(category)) and.push({ category });
  if (department) and.push({ department });
  if (assignedTo === 'none') and.push({ assignedTo: null });
  else if (assignedTo) and.push({ assignedTo });
  if (escalated === 'true') and.push({ escalated: true });
  if (mine === 'true') and.push({ assignedTo: req.user._id });
  if (overdue === 'true') and.push({ status: { $in: OPEN_STATUSES }, dueAt: { $lt: new Date() } });
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }, { ticketId: rx }] });
  }
  const dr = dateRange(req.query);
  if (dr.createdAt) and.push(dr);

  const sortMap = { oldest: 'createdAt', newest: '-createdAt', due: 'dueAt' };
  const { page, limit, skip } = getPaging(req.query, 10);
  const filter = { $and: and };
  const order = sort === 'priority' ? { priorityRank: -1, createdAt: -1 } : sortMap[sort] || '-createdAt';
  const query = Complaint.find(filter).select('-responses -timeline').populate(POPULATE).sort(order);
  const [docs, total] = await Promise.all([query.skip(skip).limit(limit), Complaint.countDocuments(filter)]);
  const items = docs.map((d) => shape(d, req.user));
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.get = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  res.json({ complaint: await respond(c, req.user) });
});

// Admin assigns to any active staff member
exports.assign = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  const staff = await User.findOne({ _id: req.body.staffId, role: 'staff', isActive: true });
  if (!staff) return res.status(400).json({ message: 'Selected staff member is not available' });
  if (['Resolved', 'Closed'].includes(c.status)) return res.status(400).json({ message: 'Cannot assign a resolved or closed complaint' });
  c.assignedTo = staff._id;
  if (c.status === 'Open') c.status = 'Assigned';
  addTimeline(c, req.user, 'Assigned', `Assigned to ${staff.name}`);
  await c.save();
  audit(req, 'COMPLAINT_ASSIGNED', req.user, { ticket: c.ticketId, to: staff.email });
  notifyUser(staff._id, { title: 'Complaint assigned to you', message: `${c.ticketId} · ${c.title} (${c.priority})`, type: 'warning', link: `/complaints/${c._id}`, email: true });
  notifyUser(c.patient, { title: 'Your complaint was assigned', message: `${c.ticketId} is now being handled by ${staff.name}.`, type: 'info', link: `/complaints/${c._id}` });
  res.json({ complaint: await respond(c, req.user) });
});

// Staff self-assign an unassigned complaint of their own department
exports.claim = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  if (req.user.role !== 'staff') return res.status(403).json({ message: 'Only staff can claim complaints' });
  if (c.assignedTo) return res.status(400).json({ message: 'This complaint is already assigned' });
  if (['Resolved', 'Closed'].includes(c.status)) return res.status(400).json({ message: 'Complaint is already resolved' });
  c.assignedTo = req.user._id;
  if (c.status === 'Open') c.status = 'Assigned';
  addTimeline(c, req.user, 'Claimed', `${req.user.name} took ownership`);
  await c.save();
  notifyUser(c.patient, { title: 'Your complaint was assigned', message: `${c.ticketId} is now being handled by ${req.user.name}.`, type: 'info', link: `/complaints/${c._id}` });
  res.json({ complaint: await respond(c, req.user) });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  const { status } = req.body;
  const user = req.user;
  const prev = c.status;
  if (status === prev) return res.status(400).json({ message: `Complaint is already ${status}` });

  if (user.role === 'patient') {
    if (status === 'Closed' && prev === 'Resolved') { /* confirm resolution */ }
    else if (status === 'Open' && ['Resolved', 'Closed'].includes(prev)) { /* reopen */ }
    else return res.status(403).json({ message: 'You can only close a resolved complaint or reopen it' });
  } else if (!canManage(c, user)) {
    return res.status(403).json({ message: 'Only the assigned staff member or an admin can update the status' });
  } else if (status === 'Open') {
    return res.status(400).json({ message: 'Use Assigned or In Progress instead' });
  }

  c.status = status;
  if (status === 'Resolved') {
    c.resolvedAt = new Date();
    c.resolutionTimeHours = hoursBetween(c.createdAt, c.resolvedAt);
  }
  if (status === 'Closed') {
    c.closedAt = new Date();
    if (!c.resolvedAt) {
      c.resolvedAt = c.closedAt;
      c.resolutionTimeHours = hoursBetween(c.createdAt, c.resolvedAt);
    }
  }
  if (status === 'Open') { // reopened by patient
    c.resolvedAt = undefined; c.closedAt = undefined; c.resolutionTimeHours = null; c.resolutionRating = undefined;
    c.dueAt = slaDue(c.priority);
    c.status = c.assignedTo ? 'In Progress' : 'Open';
  }
  if (OPEN_STATUSES.includes(c.status) && !['Open'].includes(status) && (prev === 'Resolved' || prev === 'Closed')) {
    c.resolvedAt = undefined; c.closedAt = undefined; c.resolutionTimeHours = null; c.dueAt = slaDue(c.priority);
  }
  addTimeline(c, user, `Status: ${prev} → ${c.status}`, req.body.note);
  await c.save();

  const link = `/complaints/${c._id}`;
  if (user.role === 'patient') {
    const target = c.assignedTo;
    if (target) notifyUser(target, { title: `Complaint ${c.status === 'Closed' ? 'closed' : 'reopened'} by patient`, message: `${c.ticketId} · ${c.title}`, type: c.status === 'Closed' ? 'success' : 'danger', link });
    else notifyRole('admin', { title: `Complaint reopened`, message: `${c.ticketId} · ${c.title}`, type: 'danger', link });
  } else {
    notifyUser(c.patient, {
      title: `Complaint ${c.status}`,
      message: `${c.ticketId} · ${c.title} is now ${c.status}.`,
      type: c.status === 'Resolved' || c.status === 'Closed' ? 'success' : 'info',
      link, email: c.status === 'Resolved',
    });
  }
  res.json({ complaint: await respond(c, user) });
});

exports.setPriority = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  if (!canManage(c, req.user)) return res.status(403).json({ message: 'Only the assigned staff member or an admin can change priority' });
  if (['Resolved', 'Closed'].includes(c.status)) return res.status(400).json({ message: 'Complaint is already resolved' });
  const prev = c.priority;
  if (prev === req.body.priority) return res.status(400).json({ message: `Priority is already ${prev}` });
  c.priority = req.body.priority;
  c.dueAt = slaDue(c.priority);
  addTimeline(c, req.user, `Priority: ${prev} → ${c.priority}`, req.body.note);
  await c.save();
  notifyUser(c.patient, { title: 'Complaint priority updated', message: `${c.ticketId} priority is now ${c.priority}.`, type: 'info', link: `/complaints/${c._id}` });
  res.json({ complaint: await respond(c, req.user) });
});

exports.respond = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  const user = req.user;
  const internal = user.role !== 'patient' && !!req.body.internal;
  if (user.role === 'staff' && !canManage(c, user) && c.assignedTo) {
    return res.status(403).json({ message: 'This complaint is assigned to another staff member' });
  }
  c.responses.push({ author: user._id, authorName: user.name, authorRole: user.role, message: req.body.message, internal });
  if (user.role === 'staff' && !c.assignedTo && ['Open'].includes(c.status)) { // replying implies ownership
    c.assignedTo = user._id; c.status = 'In Progress';
    addTimeline(c, user, 'Claimed', `${user.name} responded and took ownership`);
  }
  await c.save();

  const link = `/complaints/${c._id}`;
  if (!internal) {
    if (user.role === 'patient') {
      if (c.assignedTo) notifyUser(c.assignedTo, { title: 'Patient replied', message: `${c.ticketId} · ${req.body.message.slice(0, 90)}`, type: 'info', link });
      else notifyRole('admin', { title: 'Patient replied', message: `${c.ticketId} · ${req.body.message.slice(0, 90)}`, type: 'info', link });
    } else {
      notifyUser(c.patient, { title: 'Response to your complaint', message: `${c.ticketId} · ${req.body.message.slice(0, 120)}`, type: 'info', link, email: true });
    }
  }
  res.status(201).json({ complaint: await respond(c, user) });
});

// Patient rates how well the complaint was resolved
exports.rateResolution = asyncHandler(async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only the patient can rate the resolution' });
  if (!['Resolved', 'Closed'].includes(c.status)) return res.status(400).json({ message: 'You can rate only after the complaint is resolved' });
  c.resolutionRating = Number(req.body.rating);
  c.resolutionFeedback = req.body.feedback;
  addTimeline(c, req.user, 'Resolution rated', `${c.resolutionRating}★`);
  await c.save();
  if (c.assignedTo) notifyUser(c.assignedTo, { title: 'Resolution rated', message: `${c.ticketId} was rated ${c.resolutionRating}★ by the patient.`, type: c.resolutionRating >= 4 ? 'success' : 'warning', link: `/complaints/${c._id}` });
  res.json({ complaint: await respond(c, req.user) });
});

exports.remove = asyncHandler(async (req, res) => {
  const c = await Complaint.findByIdAndDelete(req.params.id);
  if (!c) return res.status(404).json({ message: 'Complaint not found' });
  audit(req, 'COMPLAINT_DELETED', req.user, { ticket: c.ticketId });
  res.json({ message: 'Complaint deleted' });
});

exports.runEscalationNow = asyncHandler(async (req, res) => {
  const count = await runEscalation();
  audit(req, 'ESCALATION_RUN_MANUAL', req.user, { escalated: count });
  res.json({ message: `${count} complaint(s) escalated`, escalated: count });
});
