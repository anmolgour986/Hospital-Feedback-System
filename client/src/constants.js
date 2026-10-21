export const CATEGORIES = [
  'Doctor Behavior', 'Staff Behavior', 'Cleanliness & Hygiene', 'Billing & Payments', 'Waiting Time', 'Food & Nutrition',
  'Facilities & Infrastructure', 'Treatment & Medical Care', 'Pharmacy & Medication', 'Emergency Services', 'Other',
];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const COMPLAINT_STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
export const REQUEST_TYPES = [
  'Wheelchair/Stretcher', 'Ambulance', 'Meal/Diet Request', 'Housekeeping/Cleaning', 'Medical Records',
  'Appointment Assistance', 'Billing Assistance', 'Nurse Assistance', 'Other',
];
export const REQUEST_STATUSES = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'];
export const VISIT_TYPES = ['OPD', 'IPD', 'Emergency', 'Diagnostics', 'Pharmacy', 'Other'];

export const COLORS = {
  teal: '#0d9488', blue: '#2563eb', amber: '#d97706', red: '#dc2626', purple: '#7c3aed', slate: '#64748b', green: '#16a34a', orange: '#ea580c',
};

export const STATUS_COLOR = {
  Open: COLORS.blue, Assigned: COLORS.purple, 'In Progress': COLORS.amber, Resolved: COLORS.green, Closed: COLORS.slate,
  Pending: COLORS.slate, Accepted: COLORS.blue, Completed: COLORS.green, Cancelled: '#94a3b8',
  Low: COLORS.slate, Medium: COLORS.blue, High: COLORS.orange, Urgent: COLORS.red,
  positive: COLORS.green, neutral: COLORS.slate, negative: COLORS.red,
};

export const fmtDate = (d, lang = 'en') =>
  d ? new Date(d).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const fmtShortDate = (d, lang = 'en') =>
  d ? new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' }) : '—';

export const hoursLabel = (h) => {
  if (h === null || h === undefined || h === 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h * 10) / 10}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
};
