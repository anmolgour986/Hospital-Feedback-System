const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const ServiceRequest = require('../models/ServiceRequest');
const Department = require('../models/Department');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { dateRange } = require('../utils/helpers');
const { OPEN_STATUSES } = require('../utils/constants');

const { ObjectId } = mongoose.Types;
const round = (n, d = 2) => (n === null || n === undefined || Number.isNaN(n) ? 0 : Math.round(n * 10 ** d) / 10 ** d);
const toKV = (rows, nameKey = '_id') => rows.map((r) => ({ name: r[nameKey] || 'Unknown', value: r.count }));

// Common $match (department scope for staff, optional department filter for admin, date range)
function baseMatch(req) {
  const m = {};
  if (req.user.role === 'staff') m.department = req.user.department || null;
  else if (req.query.department && ObjectId.isValid(req.query.department)) m.department = new ObjectId(req.query.department);
  return { ...m, ...dateRange(req.query) };
}

async function overviewData(match) {
  const now = new Date();
  const [fb, dist, sent, cStatus, cPriority, cCategory, res, overdue, escalated, urgentOpen, crating, srStatus] = await Promise.all([
    Feedback.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: 1 }, avg: { $avg: '$rating' }, satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } } } }]),
    Feedback.aggregate([{ $match: match }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
    Feedback.aggregate([{ $match: match }, { $group: { _id: '$sentiment.label', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Complaint.aggregate([{ $match: { ...match, resolutionTimeHours: { $ne: null } } }, { $group: { _id: null, avg: { $avg: '$resolutionTimeHours' }, min: { $min: '$resolutionTimeHours' }, max: { $max: '$resolutionTimeHours' } } }]),
    Complaint.countDocuments({ ...match, status: { $in: OPEN_STATUSES }, dueAt: { $lt: now } }),
    Complaint.countDocuments({ ...match, escalated: true }),
    Complaint.countDocuments({ ...match, status: { $in: OPEN_STATUSES }, priority: 'Urgent' }),
    Complaint.aggregate([{ $match: { ...match, resolutionRating: { $ne: null } } }, { $group: { _id: null, avg: { $avg: '$resolutionRating' }, count: { $sum: 1 } } }]),
    ServiceRequest.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const f = fb[0] || { total: 0, avg: 0, satisfied: 0 };
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  sent.forEach((s) => { if (s._id in sentiment) sentiment[s._id] = s.count; });
  const statusMap = Object.fromEntries(cStatus.map((s) => [s._id, s.count]));
  const totalComplaints = cStatus.reduce((a, s) => a + s.count, 0);
  const reqMap = Object.fromEntries(srStatus.map((s) => [s._id, s.count]));

  return {
    feedback: {
      total: f.total,
      avgRating: round(f.avg),
      satisfactionScore: f.total ? round((f.satisfied / f.total) * 100, 1) : 0, // CSAT: % of 4-5★
      satisfactionIndex: round((f.avg / 5) * 100, 1), // average rating as % of max
      distribution: [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: (dist.find((d) => d._id === r) || {}).count || 0 })),
      sentiment,
    },
    complaints: {
      total: totalComplaints,
      open: (statusMap.Open || 0) + (statusMap.Assigned || 0) + (statusMap['In Progress'] || 0),
      resolved: (statusMap.Resolved || 0) + (statusMap.Closed || 0),
      escalated,
      overdue,
      urgentOpen,
      byStatus: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'].map((s) => ({ name: s, value: statusMap[s] || 0 })),
      byPriority: ['Low', 'Medium', 'High', 'Urgent'].map((p) => ({ name: p, value: (cPriority.find((x) => x._id === p) || {}).count || 0 })),
      byCategory: toKV(cCategory),
      avgResolutionHours: round(res[0] && res[0].avg, 1),
      minResolutionHours: round(res[0] && res[0].min, 1),
      maxResolutionHours: round(res[0] && res[0].max, 1),
      resolutionRating: round(crating[0] && crating[0].avg),
      resolutionRatingCount: (crating[0] && crating[0].count) || 0,
    },
    requests: {
      total: srStatus.reduce((a, s) => a + s.count, 0),
      pending: reqMap.Pending || 0,
      byStatus: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'].map((s) => ({ name: s, value: reqMap[s] || 0 })),
    },
  };
}

exports.overview = asyncHandler(async (req, res) => {
  const data = await overviewData(baseMatch(req));
  if (req.user.role === 'admin') {
    const [patients, staff, departments] = await Promise.all([
      User.countDocuments({ role: 'patient', isActive: true }),
      User.countDocuments({ role: 'staff', isActive: true }),
      Department.countDocuments({ isActive: true }),
    ]);
    data.users = { patients, staff, departments };
  }
  res.json(data);
});

// Feedback trends over time (+ complaints created / resolved)
exports.trends = asyncHandler(async (req, res) => {
  const base = baseMatch({ user: req.user, query: { ...req.query, days: req.query.days || 30 } });
  const gran = ['day', 'week', 'month'].includes(req.query.granularity) ? req.query.granularity : 'day';
  const format = gran === 'month' ? '%Y-%m' : gran === 'week' ? '%G-W%V' : '%Y-%m-%d';
  const group = (field) => ({ $dateToString: { format, date: field, timezone: 'Asia/Kolkata' } });

  const resolvedMatch = { ...base };
  if (resolvedMatch.createdAt) { resolvedMatch.resolvedAt = resolvedMatch.createdAt; delete resolvedMatch.createdAt; }
  else resolvedMatch.resolvedAt = { $ne: null };

  const [fb, created, resolved] = await Promise.all([
    Feedback.aggregate([
      { $match: base },
      { $group: { _id: group('$createdAt'), count: { $sum: 1 }, avgRating: { $avg: '$rating' }, positive: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] } }, negative: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] } } } },
    ]),
    Complaint.aggregate([{ $match: base }, { $group: { _id: group('$createdAt'), count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $match: resolvedMatch }, { $group: { _id: group('$resolvedAt'), count: { $sum: 1 } } }]),
  ]);

  const map = new Map();
  const slot = (k) => {
    if (!map.has(k)) map.set(k, { period: k, feedback: 0, avgRating: 0, positive: 0, negative: 0, complaints: 0, resolved: 0 });
    return map.get(k);
  };
  fb.forEach((r) => Object.assign(slot(r._id), { feedback: r.count, avgRating: round(r.avgRating), positive: r.positive, negative: r.negative }));
  created.forEach((r) => { slot(r._id).complaints = r.count; });
  resolved.forEach((r) => { slot(r._id).resolved = r.count; });
  res.json({ granularity: gran, items: [...map.values()].sort((a, b) => a.period.localeCompare(b.period)) });
});

async function departmentData(match) {
  const [depts, fb, cp] = await Promise.all([
    Department.find({ isActive: true }).select('name').sort('name').lean(),
    Feedback.aggregate([
      { $match: match },
      { $group: { _id: '$department', count: { $sum: 1 }, avgRating: { $avg: '$rating' }, satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } }, negative: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] } } } },
    ]),
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: '$department', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }, escalated: { $sum: { $cond: ['$escalated', 1, 0] } }, avgResolution: { $avg: '$resolutionTimeHours' } } },
    ]),
  ]);
  return depts.map((d) => {
    const f = fb.find((x) => String(x._id) === String(d._id)) || {};
    const c = cp.find((x) => String(x._id) === String(d._id)) || {};
    return {
      _id: d._id, name: d.name,
      feedbackCount: f.count || 0,
      avgRating: round(f.avgRating),
      satisfactionScore: f.count ? round((f.satisfied / f.count) * 100, 1) : 0,
      negativeFeedback: f.negative || 0,
      complaints: c.total || 0,
      resolved: c.resolved || 0,
      escalated: c.escalated || 0,
      avgResolutionHours: round(c.avgResolution, 1),
    };
  });
}

exports.departments = asyncHandler(async (req, res) => {
  const match = baseMatch(req);
  delete match.department; // always list every department (staff see all too for benchmarking)
  res.json({ items: await departmentData({ ...match }) });
});

async function staffData(match) {
  const m = { ...match };
  const [staff, fb, cp] = await Promise.all([
    User.find({ role: 'staff', isActive: true, ...(m.department ? { department: m.department } : {}) }).select('name designation isDoctor department').populate('department', 'name').lean(),
    Feedback.aggregate([
      { $match: { ...m, staffMember: { $ne: null } } },
      { $group: { _id: '$staffMember', count: { $sum: 1 }, avgStaffRating: { $avg: '$staffRating' }, ratedCount: { $sum: { $cond: [{ $ifNull: ['$staffRating', false] }, 1, 0] } }, avgOverall: { $avg: '$rating' } } },
    ]),
    Complaint.aggregate([
      { $match: { ...m, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', assigned: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }, avgResolution: { $avg: '$resolutionTimeHours' }, avgResolutionRating: { $avg: '$resolutionRating' } } },
    ]),
  ]);
  return staff.map((s) => {
    const f = fb.find((x) => String(x._id) === String(s._id)) || {};
    const c = cp.find((x) => String(x._id) === String(s._id)) || {};
    return {
      _id: s._id, name: s.name, designation: s.designation, isDoctor: s.isDoctor,
      department: s.department ? s.department.name : '—',
      feedbackCount: f.count || 0,
      avgRating: round(f.ratedCount ? f.avgStaffRating : f.avgOverall),
      assigned: c.assigned || 0,
      resolved: c.resolved || 0,
      resolutionRate: c.assigned ? round((c.resolved / c.assigned) * 100, 1) : 0,
      avgResolutionHours: round(c.avgResolution, 1),
      avgResolutionRating: round(c.avgResolutionRating),
    };
  }).sort((a, b) => b.avgRating - a.avgRating);
}

exports.staff = asyncHandler(async (req, res) => {
  res.json({ items: await staffData(baseMatch(req)) });
});

// Logged-in staff member's own performance
exports.me = asyncHandler(async (req, res) => {
  const range = dateRange(req.query);
  const id = req.user._id;
  const [fb, cp, pendingAssigned, unassignedDept, reqPending] = await Promise.all([
    Feedback.aggregate([{ $match: { staffMember: id, ...range } }, { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$staffRating' }, avgOverall: { $avg: '$rating' }, rated: { $sum: { $cond: [{ $ifNull: ['$staffRating', false] }, 1, 0] } } } }]),
    Complaint.aggregate([{ $match: { assignedTo: id, ...range } }, { $group: { _id: null, assigned: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }, avgResolution: { $avg: '$resolutionTimeHours' }, avgResolutionRating: { $avg: '$resolutionRating' } } }]),
    Complaint.countDocuments({ assignedTo: id, status: { $in: OPEN_STATUSES } }),
    req.user.department ? Complaint.countDocuments({ department: req.user.department, assignedTo: null, status: 'Open' }) : 0,
    ServiceRequest.countDocuments({ status: { $in: ['Pending', 'Accepted', 'In Progress'] }, $or: [{ assignedTo: id }, ...(req.user.department ? [{ department: req.user.department, assignedTo: null }] : [])] }),
  ]);
  const f = fb[0] || {};
  const c = cp[0] || {};
  res.json({
    feedbackCount: f.count || 0,
    avgRating: round(f.rated ? f.avg : f.avgOverall),
    complaintsAssigned: c.assigned || 0,
    complaintsResolved: c.resolved || 0,
    resolutionRate: c.assigned ? round((c.resolved / c.assigned) * 100, 1) : 0,
    avgResolutionHours: round(c.avgResolution, 1),
    avgResolutionRating: round(c.avgResolutionRating),
    pendingAssigned,
    unassignedInDepartment: unassignedDept,
    pendingRequests: reqPending,
  });
});

exports.patient = asyncHandler(async (req, res) => {
  const id = req.user._id;
  const [fbCount, cStatus, rStatus] = await Promise.all([
    Feedback.countDocuments({ patient: id }),
    Complaint.aggregate([{ $match: { patient: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ServiceRequest.aggregate([{ $match: { patient: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const cm = Object.fromEntries(cStatus.map((s) => [s._id, s.count]));
  const rm = Object.fromEntries(rStatus.map((s) => [s._id, s.count]));
  res.json({
    feedbackCount: fbCount,
    complaintsTotal: cStatus.reduce((a, s) => a + s.count, 0),
    complaintsOpen: (cm.Open || 0) + (cm.Assigned || 0) + (cm['In Progress'] || 0),
    complaintsResolved: (cm.Resolved || 0) + (cm.Closed || 0),
    requestsTotal: rStatus.reduce((a, s) => a + s.count, 0),
    requestsActive: (rm.Pending || 0) + (rm.Accepted || 0) + (rm['In Progress'] || 0),
    requestsCompleted: rm.Completed || 0,
  });
});

module.exports.overviewData = overviewData;
module.exports.departmentData = departmentData;
module.exports.staffData = staffData;
module.exports.baseMatch = baseMatch;
