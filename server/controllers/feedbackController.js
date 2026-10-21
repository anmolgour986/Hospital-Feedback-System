const Feedback = require('../models/Feedback');
const Department = require('../models/Department');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { analyzeSentiment } = require('../utils/sentiment');
const { notifyUser, notifyRole } = require('../utils/notify');
const { escapeRegex, getPaging, dateRange, httpError } = require('../utils/helpers');
const { audit } = require('../utils/audit');

async function buildFeedback(body, { patient, isAnonymous, source }) {
  const { department, staffMember, comment, visitType, language } = body;
  const rating = Number(body.rating);
  const staffRating = body.staffRating ? Number(body.staffRating) : undefined;

  const dept = await Department.findOne({ _id: department, isActive: true });
  if (!dept) throw httpError(400, 'Selected department is not available');

  let staff = null;
  if (staffMember) {
    staff = await User.findOne({ _id: staffMember, role: 'staff', isActive: true });
    if (!staff) throw httpError(400, 'Selected doctor/staff member is not available');
  }
  const sentiment = analyzeSentiment(comment, rating);
  const fb = await Feedback.create({
    patient, department: dept._id, staffMember: staff ? staff._id : null, rating,
    staffRating: staff ? staffRating : undefined,
    comment, visitType, isAnonymous, source, sentiment, language,
  });

  if (rating <= 2 || sentiment.label === 'negative') {
    notifyRole('admin', { title: 'Negative feedback received', message: `${dept.name}: ${rating}★ — "${String(comment || '').slice(0, 100)}"`, type: 'warning', link: '/feedback' });
  }
  if (staff) {
    notifyUser(staff._id, { title: 'New feedback about you', message: `You received a ${staffRating || rating}★ rating from a patient.`, type: sentiment.label === 'negative' ? 'warning' : 'success', link: '/feedback' });
  }
  return fb;
}

exports.create = asyncHandler(async (req, res) => {
  const fb = await buildFeedback(req.body, { patient: req.user._id, isAnonymous: !!req.body.isAnonymous, source: 'web' });
  res.status(201).json({ feedback: fb, message: 'Thank you for your feedback!' });
});

exports.createPublic = asyncHandler(async (req, res) => {
  const fb = await buildFeedback(req.body, { patient: null, isAnonymous: true, source: 'qr' });
  res.status(201).json({ feedback: { _id: fb._id }, message: 'Thank you for your feedback!' });
});

function shape(doc, user) {
  const o = doc.toObject();
  const owner = o.patient && String(o.patient._id || o.patient) === String(user._id);
  if (o.isAnonymous && !owner) o.patient = null;
  return o;
}

exports.list = asyncHandler(async (req, res) => {
  const { department, rating, sentiment, staff, source, q } = req.query;
  const and = [];
  if (req.user.role === 'patient') and.push({ patient: req.user._id });
  else if (req.user.role === 'staff') {
    const or = [{ staffMember: req.user._id }];
    if (req.user.department) or.push({ department: req.user.department });
    and.push({ $or: or });
  }
  if (department) and.push({ department });
  if (staff) and.push({ staffMember: staff });
  if (rating) and.push({ rating: Number(rating) });
  if (['positive', 'neutral', 'negative'].includes(sentiment)) and.push({ 'sentiment.label': sentiment });
  if (['web', 'qr'].includes(source)) and.push({ source });
  if (q) and.push({ comment: new RegExp(escapeRegex(q), 'i') });
  const dr = dateRange(req.query);
  if (dr.createdAt) and.push(dr);

  const { page, limit, skip } = getPaging(req.query, 10);
  const filter = and.length ? { $and: and } : {};
  const [docs, total] = await Promise.all([
    Feedback.find(filter)
      .populate('department', 'name')
      .populate('staffMember', 'name designation isDoctor')
      .populate('patient', 'name')
      .sort('-createdAt').skip(skip).limit(limit),
    Feedback.countDocuments(filter),
  ]);
  res.json({ items: docs.map((d) => shape(d, req.user)), total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.remove = asyncHandler(async (req, res) => {
  const fb = await Feedback.findByIdAndDelete(req.params.id);
  if (!fb) return res.status(404).json({ message: 'Feedback not found' });
  audit(req, 'FEEDBACK_DELETED', req.user, { id: req.params.id });
  res.json({ message: 'Feedback removed' });
});
