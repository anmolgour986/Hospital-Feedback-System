const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../utils/mailer');
const { audit } = require('../utils/audit');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, language } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({
    name,
    email,
    password,
    phone,
    language: ['en', 'hi'].includes(language) ? language : 'en',
    role: 'patient', // public sign-up can only create patients
  });
  audit(req, 'REGISTER', user);
  sendEmail({ to: user.email, subject: 'Welcome to the Hospital Feedback System', text: `Hello ${user.name},\n\nYour account has been created. You can now share feedback, register complaints and request hospital services.` });
  res.status(201).json({ token: sign(user), user });
});

// Two separate sign-in portals: normal users (patient/staff) and administrators.
// Each portal refuses the other group's accounts, but only after the password was verified,
// so nobody can use the messages to discover which e-mail addresses belong to admins.
const makeLogin = (portal) => asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password').populate('department', 'name');
  if (user && user.lockUntil && user.lockUntil > Date.now()) {
    return res.status(423).json({ message: `Account temporarily locked after repeated failed logins. Try again in ${LOCK_MINUTES} minutes.` });
  }
  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        user.failedLoginAttempts = 0;
      }
      await user.save({ validateBeforeSave: false });
      audit(req, portal === 'admin' ? 'ADMIN_LOGIN_FAILED' : 'LOGIN_FAILED', user);
    }
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'This account has been deactivated. Contact the administrator.' });
  if (portal === 'admin' && user.role !== 'admin') {
    audit(req, 'ADMIN_PORTAL_DENIED', user);
    return res.status(403).json({ message: 'This portal is for administrators only. Please use the normal login page.' });
  }
  if (portal === 'user' && user.role === 'admin') {
    return res.status(403).json({ message: 'Administrators must sign in through the Admin Portal (/admin/login).' });
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  audit(req, portal === 'admin' ? 'ADMIN_LOGIN' : 'LOGIN', user);
  res.json({ token: sign(user), user });
});

// Admin self-registration. Protected by a secret key (ADMIN_REGISTRATION_KEY in server/.env) so that
// only people who were given the key can create administrator accounts.
const keyMatches = (given) => {
  const expected = process.env.ADMIN_REGISTRATION_KEY || '';
  const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
  return !!expected && crypto.timingSafeEqual(hash(given || ''), hash(expected));
};

exports.registerAdmin = asyncHandler(async (req, res) => {
  if (!process.env.ADMIN_REGISTRATION_KEY) {
    return res.status(503).json({ message: 'Admin registration is disabled. Set ADMIN_REGISTRATION_KEY in server/.env and restart the server.' });
  }
  const { name, email, password, adminKey } = req.body;
  if (!keyMatches(adminKey)) {
    audit(req, 'ADMIN_REGISTER_DENIED', null, { email });
    return res.status(403).json({ message: 'Invalid admin registration key' });
  }
  if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({ name, email, password, role: 'admin' });
  audit(req, 'ADMIN_REGISTER', user);
  res.status(201).json({ message: 'Admin account created. You can now log in.' });
});

exports.login = makeLogin('user');
exports.adminLogin = makeLogin('admin');

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('department', 'name');
  res.json({ user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, language, emailNotifications } = req.body;
  const user = await User.findById(req.user._id);
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (['en', 'hi'].includes(language)) user.language = language;
  if (typeof emailNotifications === 'boolean') user.emailNotifications = emailNotifications;
  await user.save();
  await user.populate('department', 'name');
  res.json({ user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = newPassword;
  await user.save();
  audit(req, 'PASSWORD_CHANGED', user);
  res.json({ message: 'Password updated successfully' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const generic = { message: 'If an account exists for this email, a reset link has been sent.' };
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (!user) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 30 * 60000);
  await user.save({ validateBeforeSave: false });

  const link = `${clientUrl()}/reset-password/${token}`;
  sendEmail({ to: user.email, subject: 'Reset your password', text: `Hello ${user.name},\n\nUse the link below to reset your password. It is valid for 30 minutes.\n\n${link}\n\nIf you did not request this, ignore this email.` });
  audit(req, 'PASSWORD_RESET_REQUESTED', user);

  // Development convenience only: when SMTP is not configured and not in production, return the link.
  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) return res.json({ ...generic, devResetLink: link });
  res.json(generic);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: new Date() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  audit(req, 'PASSWORD_RESET_DONE', user);
  res.json({ message: 'Password reset successful. You can now log in.' });
});

// Privacy: download all personal data (patients)
exports.exportData = asyncHandler(async (req, res) => {
  const id = req.user._id;
  const [feedback, complaints, requests, notifications] = await Promise.all([
    Feedback.find({ patient: id }).lean(),
    Complaint.find({ patient: id }).select('-responses.internal').lean(),
    ServiceRequest.find({ patient: id }).lean(),
    Notification.find({ user: id }).lean(),
  ]);
  audit(req, 'DATA_EXPORT', req.user);
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.json({ exportedAt: new Date(), profile: req.user, feedback, complaints, requests, notifications });
});

// Privacy: right to erasure. Personal details are removed, records are kept anonymised.
exports.deleteAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patient accounts can be deleted here' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.password || ''))) return res.status(400).json({ message: 'Password is incorrect' });
  audit(req, 'ACCOUNT_DELETED', user);
  user.name = 'Deleted User';
  user.email = `deleted-${user._id}@deleted.local`;
  user.phone = undefined;
  user.isActive = false;
  user.password = crypto.randomBytes(24).toString('hex');
  await user.save();
  await Notification.deleteMany({ user: user._id });
  res.json({ message: 'Your account has been deleted' });
});
