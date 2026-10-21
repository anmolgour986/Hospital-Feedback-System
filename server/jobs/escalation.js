const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const { notifyUser, notifyRole } = require('../utils/notify');
const { slaDue } = require('../utils/helpers');
const { PRIORITIES, OPEN_STATUSES } = require('../utils/constants');

const MAX_LEVEL = 3;

// Complaints that miss their SLA are escalated: priority goes up one level, the SLA clock restarts,
// admins and the assignee are alerted. Returns the number of escalated complaints.
async function runEscalation() {
  const overdue = await Complaint.find({
    status: { $in: OPEN_STATUSES },
    dueAt: { $lt: new Date() },
    escalationLevel: { $lt: MAX_LEVEL },
  });
  let count = 0;
  for (const c of overdue) {
    const prev = c.priority;
    const idx = PRIORITIES.indexOf(prev);
    if (idx < PRIORITIES.length - 1) c.priority = PRIORITIES[idx + 1];
    c.escalated = true;
    c.escalationLevel += 1;
    c.escalatedAt = new Date();
    c.dueAt = slaDue(c.priority);
    c.timeline.push({
      action: `Auto-escalated (level ${c.escalationLevel})`,
      byName: 'System',
      note: `SLA missed. Priority ${prev} → ${c.priority}`,
      at: new Date(),
    });
    await c.save();
    count += 1;
    const link = `/complaints/${c._id}`;
    notifyRole('admin', { title: 'Complaint escalated', message: `${c.ticketId} missed its SLA. Priority is now ${c.priority}.`, type: 'danger', link });
    if (c.assignedTo) notifyUser(c.assignedTo, { title: 'Complaint escalated', message: `${c.ticketId} is overdue and was escalated to ${c.priority}.`, type: 'danger', link, email: true });
    notifyUser(c.patient, { title: 'Your complaint has been escalated', message: `${c.ticketId} has been escalated for faster attention.`, type: 'info', link });
  }
  return count;
}

function startEscalationJob() {
  const expr = process.env.ESCALATION_CRON || '*/10 * * * *';
  if (!cron.validate(expr)) {
    console.error(`Invalid ESCALATION_CRON "${expr}", job not started`);
    return;
  }
  cron.schedule(expr, () => {
    runEscalation()
      .then((n) => n && console.log(`[escalation] ${n} complaint(s) escalated`))
      .catch((e) => console.error('[escalation] failed:', e.message));
  });
  console.log(`Escalation job scheduled (${expr})`);
}

module.exports = { startEscalationJob, runEscalation };
