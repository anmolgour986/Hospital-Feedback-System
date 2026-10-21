const AuditLog = require('../models/AuditLog');

// Fire-and-forget audit trail (security & privacy management)
function audit(req, action, user, meta = {}) {
  AuditLog.create({
    user: user ? user._id || user : undefined,
    userName: user && user.name ? user.name : undefined,
    action,
    ip: req && (req.ip || (req.connection && req.connection.remoteAddress)),
    userAgent: req && req.headers ? String(req.headers['user-agent'] || '').slice(0, 200) : undefined,
    meta,
  }).catch((e) => console.error('audit failed:', e.message));
}

module.exports = { audit };
