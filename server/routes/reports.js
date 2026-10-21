const router = require('express').Router();
const PDFDocument = require('pdfkit');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const { overviewData, departmentData, staffData } = require('../controllers/analyticsController');
const { dateRange } = require('../utils/helpers');
const { audit } = require('../utils/audit');

router.use(protect, authorize('admin'));

// pdfkit's built-in fonts only cover Latin-1, so replace anything else
const safe = (v) => String(v === undefined || v === null || v === '' ? '-' : v).replace(/[^\x20-\xFF]/g, '?');
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '-');

function startDoc(res, filename, title, range) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.rect(0, 0, doc.page.width, 70).fill('#0f766e');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('Hospital Patient Feedback & Service Management', 40, 18);
  doc.font('Helvetica').fontSize(11).text(title, 40, 42);
  doc.fillColor('#111111').fontSize(9).text(`Generated: ${fmt(new Date())}   |   Period: ${range}`, 40, 84);
  doc.moveDown(1.5);
  return doc;
}

function heading(doc, text) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.8).fillColor('#0f766e').font('Helvetica-Bold').fontSize(12).text(text, 40, doc.y);
  doc.fillColor('#111111').moveDown(0.3);
}

function kv(doc, pairs) {
  doc.font('Helvetica').fontSize(10);
  pairs.forEach(([k, v]) => {
    const y = doc.y;
    doc.fillColor('#64748b').text(k, 40, y, { width: 220 });
    doc.fillColor('#111111').font('Helvetica-Bold').text(safe(v), 260, y, { width: 280 });
    doc.font('Helvetica');
  });
}

function table(doc, headers, rows, widths) {
  const x0 = doc.page.margins.left;
  const total = widths.reduce((a, b) => a + b, 0);
  let y = doc.y + 4;
  const bottom = () => doc.page.height - doc.page.margins.bottom - 10;

  const drawRow = (cells, isHeader, zebra) => {
    const setFont = () => doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 9 : 8.5);
    setFont();
    const h = Math.max(...cells.map((c, i) => doc.heightOfString(safe(c), { width: widths[i] - 8 }))) + 8;
    if (y + h > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
      if (!isHeader) { drawRow(headers, true, false); setFont(); }
    }
    if (isHeader) doc.rect(x0, y, total, h).fill('#0f766e');
    else if (zebra) doc.rect(x0, y, total, h).fill('#f1f5f9');
    doc.fillColor(isHeader ? '#ffffff' : '#111111');
    let x = x0;
    cells.forEach((c, i) => { doc.text(safe(c), x + 4, y + 4, { width: widths[i] - 8 }); x += widths[i]; });
    y += h;
  };

  drawRow(headers, true, false);
  rows.forEach((r, i) => drawRow(r, false, i % 2 === 1));
  doc.fillColor('#111111');
  doc.x = x0;
  doc.y = y + 8;
}

const rangeLabel = (q) => (q.from || q.to ? `${q.from || 'start'} to ${q.to || 'today'}` : q.days ? `last ${q.days} days` : 'all time');

router.get('/:type.pdf', asyncHandler(async (req, res) => {
  const type = req.params.type;
  if (!['summary', 'departments', 'staff', 'complaints'].includes(type)) return res.status(404).json({ message: 'Unknown report type' });
  const match = dateRange(req.query);
  const label = rangeLabel(req.query);
  audit(req, 'REPORT_GENERATED', req.user, { type });

  if (type === 'summary') {
    const d = await overviewData(match);
    const doc = startDoc(res, 'summary-report.pdf', 'Executive Summary Report', label);
    heading(doc, 'Patient Satisfaction');
    kv(doc, [
      ['Total feedback received', d.feedback.total],
      ['Average rating (out of 5)', d.feedback.avgRating],
      ['Satisfaction score (% rating 4-5 stars)', `${d.feedback.satisfactionScore}%`],
      ['Satisfaction index (avg rating %)', `${d.feedback.satisfactionIndex}%`],
      ['Sentiment (positive / neutral / negative)', `${d.feedback.sentiment.positive} / ${d.feedback.sentiment.neutral} / ${d.feedback.sentiment.negative}`],
    ]);
    heading(doc, 'Complaints');
    kv(doc, [
      ['Total complaints', d.complaints.total],
      ['Open (not yet resolved)', d.complaints.open],
      ['Resolved / closed', d.complaints.resolved],
      ['Escalated', d.complaints.escalated],
      ['Overdue (SLA breached)', d.complaints.overdue],
      ['Average resolution time (hours)', d.complaints.avgResolutionHours],
      ['Average resolution rating', d.complaints.resolutionRating],
    ]);
    heading(doc, 'Complaints by Category');
    table(doc, ['Category', 'Count'], d.complaints.byCategory.map((c) => [c.name, c.value]), [380, 135]);
    heading(doc, 'Complaints by Priority');
    table(doc, ['Priority', 'Count'], d.complaints.byPriority.map((c) => [c.name, c.value]), [380, 135]);
    heading(doc, 'Service Requests');
    table(doc, ['Status', 'Count'], d.requests.byStatus.map((c) => [c.name, c.value]), [380, 135]);
    return doc.end();
  }

  if (type === 'departments') {
    const rows = await departmentData(match);
    const doc = startDoc(res, 'department-performance.pdf', 'Department-wise Performance Report', label);
    heading(doc, 'Department Performance');
    table(doc, ['Department', 'Feedback', 'Avg ★', 'CSAT %', 'Complaints', 'Resolved', 'Escalated', 'Avg res. (h)'],
      rows.map((r) => [r.name, r.feedbackCount, r.avgRating, r.satisfactionScore, r.complaints, r.resolved, r.escalated, r.avgResolutionHours]),
      [130, 55, 50, 55, 60, 55, 55, 55]);
    return doc.end();
  }

  if (type === 'staff') {
    const rows = await staffData(match);
    const doc = startDoc(res, 'staff-performance.pdf', 'Doctor & Staff Performance Report', label);
    heading(doc, 'Staff Performance');
    table(doc, ['Name', 'Role', 'Department', 'Ratings', 'Avg ★', 'Assigned', 'Resolved', 'Avg res. (h)'],
      rows.map((r) => [r.name, r.designation || (r.isDoctor ? 'Doctor' : 'Staff'), r.department, r.feedbackCount, r.avgRating, r.assigned, r.resolved, r.avgResolutionHours]),
      [100, 80, 85, 45, 40, 50, 50, 65]);
    return doc.end();
  }

  // complaints register
  const items = await Complaint.find(match).populate('department', 'name').populate('assignedTo', 'name').sort('-createdAt').limit(300).lean();
  const doc = startDoc(res, 'complaints-register.pdf', 'Complaint Register', label);
  heading(doc, `Complaints (latest ${items.length})`);
  table(doc, ['Ticket', 'Title', 'Dept', 'Priority', 'Status', 'Assigned', 'Created', 'Res. (h)'],
    items.map((c) => [c.ticketId, c.title, c.department && c.department.name, c.priority + (c.escalated ? '*' : ''), c.status, c.assignedTo && c.assignedTo.name, fmt(c.createdAt), c.resolutionTimeHours]),
    [70, 110, 70, 50, 55, 60, 70, 30]);
  doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('* escalated automatically after missing SLA', 40, doc.y);
  doc.end();
}));

module.exports = router;
