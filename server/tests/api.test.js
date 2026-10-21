// End-to-end API tests. Run with:  npm test
// Uses a separate database (MONGO_URI_TEST, default hospital_feedback_test) and wipes it first.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_0123456789';
process.env.CLIENT_URL = 'http://localhost:5173';
delete process.env.SMTP_HOST;

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');

const app = require('../app');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const { runEscalation } = require('../jobs/escalation');

let server;
let base;
const tokens = {};
const ids = {};

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

test.before(async () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/hospital_feedback_test';
  await mongoose.connect(uri);
  const info = await mongoose.connection.db.admin().command({ buildInfo: 1 });
  if (info.ferretdb || /ferret/i.test(JSON.stringify(info))) {
    console.log('# MongoDB-compatible emulator detected: running aggregations through mingo');
    require('./helpers/aggregateShim')(mongoose);
  }
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch(() => {})));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;

  const dept = await Department.create({ name: 'Cardiology' });
  const dept2 = await Department.create({ name: 'Pharmacy' });
  ids.dept = String(dept._id);
  ids.dept2 = String(dept2._id);
  await User.create({ name: 'Admin', email: 'admin@t.com', password: 'Admin1234', role: 'admin' });
  const staff = await User.create({ name: 'Dr Staff', email: 'staff@t.com', password: 'Staff1234', role: 'staff', department: dept._id, isDoctor: true, designation: 'Cardiologist' });
  await User.create({ name: 'Other Staff', email: 'staff2@t.com', password: 'Staff1234', role: 'staff', department: dept2._id });
  ids.staff = String(staff._id);
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((r) => server.close(r));
});

test('health + unknown route', async () => {
  assert.equal((await api('GET', '/api/health')).status, 200);
  assert.equal((await api('GET', '/api/nope')).status, 404);
});

test('registration validation and duplicate protection', async () => {
  let r = await api('POST', '/api/auth/register', { body: { name: 'P', email: 'bad', password: '123' } });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/auth/register', { body: { name: 'Pat One', email: 'pat@t.com', password: 'Patient123', role: 'admin' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'patient', 'public sign-up can never create admin');
  assert.equal(r.data.user.password, undefined, 'password hash never leaves the server');
  tokens.patient = r.data.token;
  ids.patient = r.data.user._id;
  r = await api('POST', '/api/auth/register', { body: { name: 'Pat Two', email: 'PAT@t.com', password: 'Patient123' } });
  assert.equal(r.status, 409);
  r = await api('POST', '/api/auth/register', { body: { name: 'Pat Three', email: 'pat3@t.com', password: 'Patient123' } });
  tokens.patient2 = r.data.token;
});

test('login, wrong password, me, lockout', async () => {
  let r = await api('POST', '/api/auth/login', { body: { email: 'admin@t.com', password: 'Admin1234' } });
  assert.equal(r.status, 403, 'admins cannot use the normal login page');
  r = await api('POST', '/api/auth/admin-login', { body: { email: 'staff@t.com', password: 'Staff1234' } });
  assert.equal(r.status, 403, 'staff cannot use the admin portal');
  r = await api('POST', '/api/auth/admin-login', { body: { email: 'admin@t.com', password: 'wrong-pass1' } });
  assert.equal(r.status, 401);
  r = await api('POST', '/api/auth/admin-login', { body: { email: 'admin@t.com', password: 'Admin1234' } });
  assert.equal(r.status, 200);
  tokens.admin = r.data.token;
  r = await api('POST', '/api/auth/login', { body: { email: 'staff@t.com', password: 'Staff1234' } });
  tokens.staff = r.data.token;
  r = await api('POST', '/api/auth/login', { body: { email: 'staff2@t.com', password: 'Staff1234' } });
  tokens.staff2 = r.data.token;
  r = await api('GET', '/api/auth/me', { token: tokens.patient });
  assert.equal(r.data.user.email, 'pat@t.com');
  assert.equal((await api('GET', '/api/auth/me')).status, 401);
  assert.equal((await api('GET', '/api/auth/me', { token: 'garbage' })).status, 401);

  // lockout after 5 failures on a throw-away account
  await api('POST', '/api/auth/register', { body: { name: 'Lock Me', email: 'lock@t.com', password: 'Patient123' } });
  for (let i = 0; i < 5; i++) {
    r = await api('POST', '/api/auth/login', { body: { email: 'lock@t.com', password: 'wrong-pass1' } });
    assert.equal(r.status, 401);
  }
  r = await api('POST', '/api/auth/login', { body: { email: 'lock@t.com', password: 'Patient123' } });
  assert.equal(r.status, 423, 'account locked even with the right password');
});

test('role-based access control', async () => {
  assert.equal((await api('GET', '/api/users', { token: tokens.patient })).status, 403);
  assert.equal((await api('GET', '/api/users', { token: tokens.staff })).status, 403);
  assert.equal((await api('GET', '/api/users', { token: tokens.admin })).status, 200);
  assert.equal((await api('GET', '/api/audit', { token: tokens.staff })).status, 403);
  assert.equal((await api('GET', '/api/analytics/overview', { token: tokens.patient })).status, 403);
  assert.equal((await api('GET', '/api/reports/summary.pdf', { token: tokens.staff })).status, 403);
  assert.equal((await api('POST', '/api/departments', { token: tokens.staff, body: { name: 'Hack' } })).status, 403);
  assert.equal((await api('POST', '/api/complaints', { token: tokens.admin, body: {} })).status, 403, 'only patients file complaints');
});

test('feedback: rating validation, staff rating, history, anonymous', async () => {
  let r = await api('POST', '/api/feedback', { token: tokens.patient, body: { department: ids.dept, rating: 9 } });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/feedback', { token: tokens.patient, body: { department: 'xyz', rating: 4 } });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/feedback', { token: tokens.patient, body: { department: ids.dept, rating: 5, staffMember: ids.staff, staffRating: 4, comment: 'The doctor was very helpful and caring', visitType: 'OPD' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.feedback.sentiment.label, 'positive');
  r = await api('POST', '/api/feedback', { token: tokens.patient, body: { department: ids.dept, rating: 1, comment: 'Rude staff, dirty washroom and long delay', isAnonymous: true } });
  assert.equal(r.status, 201);
  assert.equal(r.data.feedback.sentiment.label, 'negative');
  r = await api('POST', '/api/feedback', { token: tokens.patient, body: { department: ids.dept, rating: 5, comment: 'बहुत अच्छा इलाज, धन्यवाद' } });
  assert.equal(r.data.feedback.sentiment.label, 'positive', 'Hindi comments are scored');

  // history: patient sees own (including anonymous ones), others do not
  r = await api('GET', '/api/feedback', { token: tokens.patient });
  assert.equal(r.data.total, 3);
  assert.equal((await api('GET', '/api/feedback', { token: tokens.patient2 })).data.total, 0);

  // admin / staff must not see who wrote an anonymous review
  r = await api('GET', '/api/feedback?rating=1', { token: tokens.admin });
  assert.equal(r.data.items.length, 1);
  assert.equal(r.data.items[0].patient, null);
  r = await api('GET', '/api/feedback?rating=5', { token: tokens.admin });
  assert.ok(r.data.items.every((f) => f.patient && f.patient.name));
  // filters
  r = await api('GET', `/api/feedback?sentiment=negative&department=${ids.dept}`, { token: tokens.admin });
  assert.equal(r.data.total, 1);
  r = await api('GET', '/api/feedback?q=helpful', { token: tokens.admin });
  assert.equal(r.data.total, 1);
  // staff of another department sees nothing of Cardiology
  assert.equal((await api('GET', '/api/feedback', { token: tokens.staff2 })).data.total, 0);
  assert.equal((await api('GET', '/api/feedback', { token: tokens.staff })).data.total, 3);
});

test('public QR feedback works without login and stays anonymous', async () => {
  let r = await api('GET', '/api/public/directory');
  assert.equal(r.status, 200);
  assert.equal(r.data.departments.length, 2);
  assert.ok(!JSON.stringify(r.data).includes('@'), 'no e-mail addresses are exposed publicly');
  r = await api('POST', '/api/public/feedback', { body: { department: ids.dept, rating: 4, comment: 'Quick service', staffMember: ids.staff, staffRating: 5 } });
  assert.equal(r.status, 201);
  r = await api('GET', '/api/feedback?source=qr', { token: tokens.admin });
  assert.equal(r.data.total, 1);
  assert.equal(r.data.items[0].patient, null);
  r = await api('POST', '/api/public/feedback', { body: { department: ids.dept, rating: 0 } });
  assert.equal(r.status, 400);
});

test('QR code generation', async () => {
  let r = await api('GET', `/api/qr?department=${ids.dept}`, { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.match(r.data.dataUrl, /^data:image\/png;base64,/);
  assert.match(r.data.url, /\/feedback\/public\?dept=/);
  assert.equal((await api('GET', '/api/qr', { token: tokens.patient })).status, 403);
  assert.equal((await api('GET', '/api/qr?department=bad', { token: tokens.admin })).status, 400);
});

test('complaints: create, auto category + urgency, validation', async () => {
  let r = await api('POST', '/api/complaints', { token: tokens.patient, body: { department: ids.dept, title: 'ab', description: 'short' } });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/complaints', { token: tokens.patient, body: { department: ids.dept, title: 'Overcharged in final bill', description: 'I was overcharged in the bill and the payment refund is pending.', priority: 'Low' } });
  assert.equal(r.status, 201);
  const c = r.data.complaint;
  assert.equal(c.category, 'Billing & Payments');
  assert.equal(c.status, 'Open');
  assert.match(c.ticketId, /^CMP-\d{4}-[0-9A-F]{6}$/);
  assert.ok(c.dueAt, 'SLA deadline set');
  assert.ok(c.sentiment && c.sentiment.label);
  ids.c1 = c._id;

  r = await api('POST', '/api/complaints', { token: tokens.patient, body: { department: ids.dept, title: 'Patient not breathing', description: 'My father is unconscious and not breathing, nobody came to help.' } });
  assert.equal(r.data.complaint.priority, 'Urgent', 'emergency keywords raise priority automatically');
  ids.cUrgent = r.data.complaint._id;

  r = await api('POST', '/api/complaints', { token: tokens.patient, body: { department: ids.dept, title: 'Dirty washroom on floor', description: 'The washroom is dirty and smells bad.', priority: 'High', isAnonymous: true } });
  assert.equal(r.data.complaint.category, 'Cleanliness & Hygiene');
  ids.cAnon = r.data.complaint._id;
});

test('complaint list: scope, search, filters and priority sort across pages', async () => {
  let r = await api('GET', '/api/complaints', { token: tokens.patient });
  assert.equal(r.data.total, 3);
  assert.equal((await api('GET', '/api/complaints', { token: tokens.patient2 })).data.total, 0);
  assert.equal((await api('GET', `/api/complaints/${ids.c1}`, { token: tokens.patient2 })).status, 403, 'cannot read other patients complaints');
  assert.equal((await api('GET', '/api/complaints/not-an-id', { token: tokens.admin })).status, 400);
  assert.equal((await api('GET', '/api/complaints/64b000000000000000000000', { token: tokens.admin })).status, 404);
  assert.equal((await api('GET', '/api/complaints', { token: tokens.staff2 })).data.total, 0, 'other-department staff cannot see them');
  assert.equal((await api('GET', '/api/complaints', { token: tokens.staff })).data.total, 3);

  r = await api('GET', '/api/complaints?q=washroom', { token: tokens.admin });
  assert.equal(r.data.total, 1);
  r = await api('GET', '/api/complaints?q=' + encodeURIComponent('(.*'), { token: tokens.admin });
  assert.equal(r.status, 200, 'regex characters in search are escaped');
  r = await api('GET', '/api/complaints?priority=Urgent', { token: tokens.admin });
  assert.equal(r.data.total, 1);
  r = await api('GET', '/api/complaints?category=' + encodeURIComponent('Billing & Payments'), { token: tokens.admin });
  assert.equal(r.data.total, 1);
  r = await api('GET', '/api/complaints?sort=priority&limit=1&page=1', { token: tokens.admin });
  assert.equal(r.data.items[0].priority, 'Urgent', 'priority sort works across pages');
  r = await api('GET', '/api/complaints?sort=priority&limit=1&page=2', { token: tokens.admin });
  assert.equal(r.data.items[0].priority, 'High');
});

test('assignment, claiming, status flow, responses', async () => {
  // admin assigns
  let r = await api('PUT', `/api/complaints/${ids.c1}/assign`, { token: tokens.admin, body: { staffId: ids.staff } });
  assert.equal(r.status, 200);
  assert.equal(r.data.complaint.status, 'Assigned');
  assert.equal(r.data.complaint.assignedTo.name, 'Dr Staff');
  assert.equal((await api('PUT', `/api/complaints/${ids.c1}/assign`, { token: tokens.staff, body: { staffId: ids.staff } })).status, 403);
  assert.equal((await api('PUT', `/api/complaints/${ids.c1}/assign`, { token: tokens.admin, body: { staffId: ids.patient } })).status, 400, 'cannot assign to a non-staff user');

  // other staff cannot manage it
  r = await api('PUT', `/api/complaints/${ids.c1}/status`, { token: tokens.staff2, body: { status: 'In Progress' } });
  assert.equal(r.status, 403);
  // patient cannot jump to Resolved
  r = await api('PUT', `/api/complaints/${ids.c1}/status`, { token: tokens.patient, body: { status: 'Resolved' } });
  assert.equal(r.status, 403);
  r = await api('PUT', `/api/complaints/${ids.c1}/status`, { token: tokens.staff, body: { status: 'In Progress', note: 'Checking invoice' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.complaint.status, 'In Progress');

  // response + internal note visibility
  r = await api('POST', `/api/complaints/${ids.c1}/respond`, { token: tokens.staff, body: { message: 'We are reviewing your bill.' } });
  assert.equal(r.status, 201);
  r = await api('POST', `/api/complaints/${ids.c1}/respond`, { token: tokens.staff, body: { message: 'Internal: accountant confirmed error', internal: true } });
  assert.equal(r.status, 201);
  r = await api('POST', `/api/complaints/${ids.c1}/respond`, { token: tokens.patient, body: { message: 'Thank you' } });
  assert.equal(r.status, 201);
  r = await api('GET', `/api/complaints/${ids.c1}`, { token: tokens.patient });
  assert.equal(r.data.complaint.responses.length, 2, 'patient must not see internal notes');
  r = await api('GET', `/api/complaints/${ids.c1}`, { token: tokens.staff });
  assert.equal(r.data.complaint.responses.length, 3);
  assert.equal((await api('POST', `/api/complaints/${ids.c1}/respond`, { token: tokens.patient, body: { message: '   ' } })).status, 400);

  // priority change
  r = await api('PUT', `/api/complaints/${ids.c1}/priority`, { token: tokens.staff, body: { priority: 'High' } });
  assert.equal(r.data.complaint.priority, 'High');
  assert.equal((await api('PUT', `/api/complaints/${ids.c1}/priority`, { token: tokens.patient, body: { priority: 'Low' } })).status, 403);

  // resolve -> resolution time recorded
  r = await api('PUT', `/api/complaints/${ids.c1}/status`, { token: tokens.staff, body: { status: 'Resolved' } });
  assert.equal(r.status, 200);
  assert.ok(r.data.complaint.resolvedAt);
  assert.equal(typeof r.data.complaint.resolutionTimeHours, 'number');
  // patient rates resolution, then closes
  r = await api('PUT', `/api/complaints/${ids.c1}/rate`, { token: tokens.patient, body: { rating: 5, feedback: 'Fixed quickly' } });
  assert.equal(r.data.complaint.resolutionRating, 5);
  r = await api('PUT', `/api/complaints/${ids.c1}/status`, { token: tokens.patient, body: { status: 'Closed' } });
  assert.equal(r.data.complaint.status, 'Closed');
  // reopen
  r = await api('PUT', `/api/complaints/${ids.c1}/status`, { token: tokens.patient, body: { status: 'Open' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.complaint.status, 'In Progress');
  assert.equal(r.data.complaint.resolvedAt, undefined);
  // rating not allowed on an open complaint
  assert.equal((await api('PUT', `/api/complaints/${ids.c1}/rate`, { token: tokens.patient, body: { rating: 3 } })).status, 400);

  // staff claim of unassigned complaint in their own department
  r = await api('PUT', `/api/complaints/${ids.cUrgent}/claim`, { token: tokens.staff });
  assert.equal(r.status, 200);
  assert.equal(r.data.complaint.status, 'Assigned');
  assert.equal((await api('PUT', `/api/complaints/${ids.cUrgent}/claim`, { token: tokens.staff })).status, 400, 'already assigned');
  assert.equal((await api('PUT', `/api/complaints/${ids.cAnon}/claim`, { token: tokens.staff2 })).status, 403, 'other department cannot claim');
});

test('anonymous complaint hides the patient from staff and admin everywhere', async () => {
  await api('POST', `/api/complaints/${ids.cAnon}/respond`, { token: tokens.patient, body: { message: 'Please hurry' } });
  for (const t of [tokens.admin, tokens.staff]) {
    const r = await api('GET', `/api/complaints/${ids.cAnon}`, { token: t });
    const raw = JSON.stringify(r.data);
    assert.equal(r.data.complaint.patient, null);
    assert.ok(!raw.includes('Pat One'), 'patient name must not leak through responses or timeline');
    assert.ok(!raw.includes(ids.patient), 'patient id must not leak');
  }
  const own = await api('GET', `/api/complaints/${ids.cAnon}`, { token: tokens.patient });
  assert.equal(own.data.complaint.patient.name, 'Pat One', 'owner still sees their own complaint');
  const list = await api('GET', '/api/complaints', { token: tokens.admin });
  assert.ok(!JSON.stringify(list.data).includes('Pat One') || list.data.items.some((i) => i.patient), 'only non-anonymous rows show names');
  assert.equal(list.data.items.find((i) => i._id === ids.cAnon).patient, null);
});

test('automatic escalation of overdue complaints', async () => {
  const c = await Complaint.findById(ids.cAnon);
  c.dueAt = new Date(Date.now() - 3600 * 1000);
  await c.save();
  const before = c.priority;
  const n = await runEscalation();
  assert.ok(n >= 1);
  const after = await Complaint.findById(ids.cAnon);
  assert.equal(after.escalated, true);
  assert.equal(after.escalationLevel, 1);
  assert.notEqual(after.priority, before);
  assert.equal(after.priorityRank, 3, 'rank follows the new priority (Urgent)');
  assert.ok(after.dueAt > new Date(), 'SLA clock restarted');
  assert.equal(await runEscalation(), 0, 'not escalated twice for the same breach');
  const r = await api('POST', '/api/complaints/escalate/run', { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.equal((await api('POST', '/api/complaints/escalate/run', { token: tokens.staff })).status, 403);
});

test('service requests and status tracking', async () => {
  let r = await api('POST', '/api/requests', { token: tokens.patient, body: { type: 'Teleportation' } });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/requests', { token: tokens.patient, body: { type: 'Wheelchair/Stretcher', department: ids.dept, location: 'Ward 2, Bed 5', priority: 'High' } });
  assert.equal(r.status, 201);
  assert.match(r.data.request.requestId, /^SRQ-/);
  const id = r.data.request._id;
  assert.equal(r.data.request.timeline.length, 1);
  assert.equal((await api('GET', `/api/requests/${id}`, { token: tokens.patient2 })).status, 403);
  assert.equal((await api('PUT', `/api/requests/${id}/status`, { token: tokens.staff2, body: { status: 'Accepted' } })).status, 403, 'other department');
  r = await api('PUT', `/api/requests/${id}/status`, { token: tokens.staff, body: { status: 'Accepted' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.request.assignedTo.name, 'Dr Staff', 'accepting takes ownership');
  r = await api('PUT', `/api/requests/${id}/status`, { token: tokens.staff, body: { status: 'Completed' } });
  assert.ok(r.data.request.completedAt);
  assert.equal(r.data.request.timeline.length, 3);
  assert.equal((await api('PUT', `/api/requests/${id}/status`, { token: tokens.patient, body: { status: 'Cancelled' } })).status, 400, 'finished requests are locked');
  // patient can cancel a pending one
  r = await api('POST', '/api/requests', { token: tokens.patient, body: { type: 'Meal/Diet Request' } });
  r = await api('PUT', `/api/requests/${r.data.request._id}/status`, { token: tokens.patient, body: { status: 'Cancelled' } });
  assert.equal(r.data.request.status, 'Cancelled');
  assert.equal((await api('GET', '/api/requests?status=Completed', { token: tokens.patient })).data.total, 1);
});

test('notifications: created, counted, marked read', async () => {
  let r = await api('GET', '/api/notifications', { token: tokens.patient });
  assert.ok(r.data.total > 0 && r.data.unread > 0);
  const first = r.data.items[0]._id;
  r = await api('PUT', `/api/notifications/${first}/read`, { token: tokens.patient });
  assert.equal(r.data.notification.read, true);
  assert.equal((await api('PUT', `/api/notifications/${first}/read`, { token: tokens.patient2 })).status, 404, "cannot touch someone else's notification");
  await api('PUT', '/api/notifications/read-all', { token: tokens.patient });
  assert.equal((await api('GET', '/api/notifications/unread-count', { token: tokens.patient })).data.unread, 0);
  const a = await api('GET', '/api/notifications', { token: tokens.admin });
  assert.ok(a.data.items.some((n) => /complaint/i.test(n.title)), 'admins are alerted about complaints');
});

test('analytics: overview, trends, departments, staff, dashboards', async () => {
  let r = await api('GET', '/api/analytics/overview', { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.equal(r.data.feedback.total, 4);
  assert.ok(r.data.feedback.avgRating > 0 && r.data.feedback.avgRating <= 5);
  assert.ok(r.data.feedback.satisfactionScore >= 0 && r.data.feedback.satisfactionScore <= 100);
  assert.equal(r.data.complaints.total, 3);
  assert.equal(r.data.feedback.distribution.length, 5);
  assert.equal(r.data.users.staff, 2);
  r = await api('GET', '/api/analytics/trends?days=30', { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.ok(r.data.items.length >= 1);
  for (const g of ['week', 'month']) assert.equal((await api('GET', `/api/analytics/trends?granularity=${g}`, { token: tokens.admin })).status, 200);
  r = await api('GET', '/api/analytics/departments', { token: tokens.admin });
  const cardio = r.data.items.find((d) => d.name === 'Cardiology');
  assert.equal(cardio.feedbackCount, 4);
  assert.equal(cardio.complaints, 3);
  r = await api('GET', '/api/analytics/staff', { token: tokens.admin });
  const dr = r.data.items.find((s) => s.name === 'Dr Staff');
  assert.equal(dr.feedbackCount, 2);
  assert.ok(dr.avgRating >= 4);
  r = await api('GET', '/api/analytics/me', { token: tokens.staff });
  assert.equal(r.data.feedbackCount, 2);
  r = await api('GET', '/api/analytics/patient', { token: tokens.patient });
  assert.equal(r.data.complaintsTotal, 3);
  assert.equal(r.data.requestsTotal, 2);
  // staff overview is limited to their department
  r = await api('GET', '/api/analytics/overview', { token: tokens.staff2 });
  assert.equal(r.data.feedback.total, 0);
});

test('PDF reports', async () => {
  for (const t of ['summary', 'departments', 'staff', 'complaints']) {
    const r = await api('GET', `/api/reports/${t}.pdf?days=90`, { token: tokens.admin });
    assert.equal(r.status, 200, t);
    assert.match(r.headers.get('content-type'), /application\/pdf/);
    assert.equal(r.data.subarray(0, 5).toString(), '%PDF-', t);
    assert.ok(r.data.length > 800);
  }
  assert.equal((await api('GET', '/api/reports/other.pdf', { token: tokens.admin })).status, 404);
});

test('user and department management', async () => {
  let r = await api('POST', '/api/departments', { token: tokens.admin, body: { name: 'Neurology', description: 'Brain' } });
  assert.equal(r.status, 201);
  const nid = r.data.department._id;
  assert.equal((await api('POST', '/api/departments', { token: tokens.admin, body: { name: 'Neurology' } })).status, 409, 'duplicate department');
  r = await api('PUT', `/api/departments/${nid}`, { token: tokens.admin, body: { description: 'Brain & nerves' } });
  assert.equal(r.data.department.description, 'Brain & nerves');
  r = await api('DELETE', `/api/departments/${nid}`, { token: tokens.admin });
  assert.equal(r.data.message, 'Department deleted');
  r = await api('DELETE', `/api/departments/${ids.dept}`, { token: tokens.admin });
  assert.match(r.data.message, /deactivated/, 'departments with data are deactivated, never orphaned');
  await api('PUT', `/api/departments/${ids.dept}`, { token: tokens.admin, body: { isActive: true } });

  r = await api('POST', '/api/users', { token: tokens.admin, body: { name: 'New Nurse', email: 'nurse@t.com', password: 'Nurse12345', role: 'staff', department: ids.dept, designation: 'Nurse' } });
  assert.equal(r.status, 201);
  const uid = r.data.user._id;
  assert.equal((await api('POST', '/api/users', { token: tokens.admin, body: { name: 'New Nurse', email: 'nurse@t.com', password: 'Nurse12345', role: 'staff' } })).status, 409);
  assert.equal((await api('GET', '/api/users?q=nurse&role=staff', { token: tokens.admin })).data.total, 1);
  r = await api('PUT', `/api/users/${uid}`, { token: tokens.admin, body: { isActive: false } });
  assert.equal(r.data.user.isActive, false);
  r = await api('POST', '/api/auth/login', { body: { email: 'nurse@t.com', password: 'Nurse12345' } });
  assert.equal(r.status, 403, 'deactivated users cannot log in');
  const me = await User.findOne({ email: 'admin@t.com' });
  r = await api('PUT', `/api/users/${me._id}`, { token: tokens.admin, body: { role: 'patient' } });
  assert.equal(r.status, 400, 'admin cannot demote themselves');
  r = await api('PUT', `/api/users/${uid}/password`, { token: tokens.admin, body: { password: 'Brandnew123' } });
  assert.equal(r.status, 200);
});

test('password reset and change', async () => {
  let r = await api('POST', '/api/auth/forgot-password', { body: { email: 'nobody@t.com' } });
  assert.equal(r.status, 200, 'does not reveal whether an account exists');
  assert.equal(r.data.devResetLink, undefined);
  r = await api('POST', '/api/auth/forgot-password', { body: { email: 'pat3@t.com' } });
  const token = r.data.devResetLink.split('/').pop();
  assert.equal((await api('POST', '/api/auth/reset-password/badtoken123', { body: { password: 'Newpass123' } })).status, 400);
  assert.equal((await api('POST', `/api/auth/reset-password/${token}`, { body: { password: 'weak' } })).status, 400);
  assert.equal((await api('POST', `/api/auth/reset-password/${token}`, { body: { password: 'Newpass123' } })).status, 200);
  assert.equal((await api('POST', `/api/auth/reset-password/${token}`, { body: { password: 'Another123' } })).status, 400, 'token is single use');
  assert.equal((await api('POST', '/api/auth/login', { body: { email: 'pat3@t.com', password: 'Newpass123' } })).status, 200);

  r = await api('PUT', '/api/auth/password', { token: tokens.patient2, body: { currentPassword: 'wrongwrong1', newPassword: 'Changed1234' } });
  assert.equal(r.status, 400);
});

test('profile, language, privacy export and account deletion', async () => {
  let r = await api('PUT', '/api/auth/profile', { token: tokens.patient, body: { language: 'hi', name: 'Pat Updated' } });
  assert.equal(r.data.user.language, 'hi');
  r = await api('GET', '/api/auth/export', { token: tokens.patient });
  assert.equal(r.status, 200);
  assert.ok(r.data.feedback.length >= 3 && r.data.complaints.length >= 3);
  assert.equal(r.data.profile.password, undefined);
  r = await api('DELETE', '/api/auth/account', { token: tokens.patient, body: { password: 'nope' } });
  assert.equal(r.status, 400);
  r = await api('DELETE', '/api/auth/account', { token: tokens.patient, body: { password: 'Patient123' } });
  assert.equal(r.status, 200);
  assert.equal((await api('GET', '/api/auth/me', { token: tokens.patient })).status, 401, 'deleted account cannot use old token');
  assert.equal((await api('POST', '/api/auth/login', { body: { email: 'pat@t.com', password: 'Patient123' } })).status, 401);
});

test('audit log and security hardening', async () => {
  let r = await api('GET', '/api/audit?limit=100', { token: tokens.admin });
  assert.equal(r.status, 200);
  const actions = r.data.items.map((a) => a.action);
  for (const a of ['REGISTER', 'LOGIN', 'LOGIN_FAILED', 'COMPLAINT_ASSIGNED', 'ACCOUNT_DELETED']) assert.ok(actions.includes(a), a);
  assert.ok(r.headers.get('x-content-type-options'), 'helmet headers present');
  // NoSQL operator injection is neutralised
  r = await api('POST', '/api/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/auth/login', { body: '{bad json' });
  assert.equal(r.status, 400);
});
