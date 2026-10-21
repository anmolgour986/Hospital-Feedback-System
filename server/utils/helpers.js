const { SLA_HOURS } = require('./constants');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPaging = (q, defLimit = 10) => {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || defLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const slaDue = (priority, from = new Date()) =>
  new Date(from.getTime() + (SLA_HOURS[priority] || SLA_HOURS.Medium) * 3600 * 1000);

// Builds { createdAt: { $gte, $lte } } from from/to/days query values
const dateRange = (q = {}, field = 'createdAt') => {
  const r = {};
  let from = q.from ? new Date(q.from) : null;
  if (!from && q.days) {
    const d = Math.min(parseInt(q.days, 10) || 0, 3650);
    if (d > 0) from = new Date(Date.now() - d * 24 * 3600 * 1000);
  }
  if (from && !isNaN(from)) r.$gte = from;
  if (q.to) {
    const t = new Date(q.to);
    if (!isNaN(t)) {
      t.setHours(23, 59, 59, 999);
      r.$lte = t;
    }
  }
  return Object.keys(r).length ? { [field]: r } : {};
};

const httpError = (status, message) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

const hoursBetween = (a, b) => Math.round(((b - a) / 36e5) * 100) / 100;

module.exports = { escapeRegex, getPaging, slaDue, dateRange, httpError, hoursBetween };
