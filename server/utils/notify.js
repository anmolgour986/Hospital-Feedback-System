const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./socket');
const { sendEmail } = require('./mailer');

// Never throws: a failed notification must not break the main request.
async function notifyUser(userId, { title, message, type = 'info', link = '', email = false }) {
  try {
    if (!userId) return null;
    const n = await Notification.create({ user: userId, title, message, type, link });
    emitToUser(userId, 'notification', n);
    if (email) {
      const u = await User.findById(userId).select('email emailNotifications isActive');
      if (u && u.isActive && u.emailNotifications !== false) {
        sendEmail({ to: u.email, subject: title, text: `${message}${link ? `\n\nOpen: ${(process.env.CLIENT_URL || '').split(',')[0]}${link}` : ''}` });
      }
    }
    return n;
  } catch (err) {
    console.error('notifyUser failed:', err.message);
    return null;
  }
}

async function notifyRole(role, payload, { department } = {}) {
  try {
    const filter = { role, isActive: true };
    if (department) filter.department = department;
    const users = await User.find(filter).select('_id');
    await Promise.all(users.map((u) => notifyUser(u._id, payload)));
  } catch (err) {
    console.error('notifyRole failed:', err.message);
  }
}

module.exports = { notifyUser, notifyRole };
