// Demo data. Usage:  npm run seed        (only seeds an empty database)
//                    npm run seed:reset  (WIPES all collections, then seeds)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Department = require('./models/Department');
const Feedback = require('./models/Feedback');
const Complaint = require('./models/Complaint');
const ServiceRequest = require('./models/ServiceRequest');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const { analyzeSentiment } = require('./utils/sentiment');
const { categorize } = require('./utils/categorize');
const { slaDue, hoursBetween } = require('./utils/helpers');

const reset = process.argv.includes('--reset');
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const daysAgo = (d, h = rnd(0, 20)) => new Date(Date.now() - d * 864e5 - h * 36e5);

const DEPARTMENTS = [
  ['Cardiology', 'Heart and vascular care'], ['Neurology', 'Brain and nervous system'], ['Orthopedics', 'Bones and joints'],
  ['Pediatrics', 'Child healthcare'], ['Emergency', '24x7 emergency and trauma care'], ['Radiology', 'Imaging and diagnostics'],
  ['Pharmacy', 'Medicines and prescriptions'], ['General Medicine', 'OPD and general care'], ['Billing & Administration', 'Billing, insurance and records'],
];

const POS = ['The doctor was very helpful and explained everything clearly', 'Staff were polite and caring', 'Very clean ward and quick service', 'Excellent treatment, thank you', 'बहुत अच्छा इलाज, धन्यवाद', 'Professional team and short waiting time', 'Nurses were caring and supportive'];
const NEU = ['Average experience overall', 'Service was okay', 'Nothing special, nothing bad', 'Waited a bit but treatment was fine'];
const NEG = ['Very long waiting time and nobody informed us', 'The washroom was dirty and smelled bad', 'Staff was rude and ignored our questions', 'Overcharged in the final bill', 'बहुत देरी हुई और गंदगी थी', 'Medicine was out of stock and pharmacy was slow', 'Food was cold and tasteless'];

const COMPLAINTS = [
  ['Washroom not cleaned for two days', 'The washroom near ward 3 is dirty and smells bad. Nobody has cleaned it for two days.'],
  ['Long waiting time for OPD', 'I waited more than three hours for my appointment and there was no information about the delay.'],
  ['Wrong amount in the bill', 'I was overcharged in the final bill for services that were not provided. Please check the invoice.'],
  ['Nurse was rude', 'The night nurse was rude and ignored my repeated calls for help.'],
  ['Medicine not available at pharmacy', 'The prescribed medicine was out of stock and the pharmacy staff did not suggest an alternative.'],
  ['AC not working in room 214', 'The air conditioner in room 214 has been broken since yesterday and the patient is uncomfortable.'],
  ['Ambulance delayed', 'Emergency ambulance reached very late. This is critical, the patient was in serious condition.'],
  ['Food quality is poor', 'The meals served are cold and tasteless and not according to the diet chart.'],
  ['Doctor did not explain treatment', 'The doctor did not explain the diagnosis or the treatment plan properly.'],
  ['पानी की सप्लाई बंद', 'वार्ड में पानी की सप्लाई कल से बंद है, कृपया जल्दी ठीक करें।'],
];

async function main() {
  await connectDB();
  if (reset) {
    await Promise.all([User, Department, Feedback, Complaint, ServiceRequest, Notification, AuditLog].map((m) => m.deleteMany({})));
    console.log('Database cleared.');
  } else if (await User.countDocuments()) {
    console.log('Database already has data. Use "npm run seed:reset" to wipe and reseed.');
    return mongoose.disconnect();
  }

  const depts = await Department.insertMany(DEPARTMENTS.map(([name, description]) => ({ name, description })));
  const byName = Object.fromEntries(depts.map((d) => [d.name, d]));

  const admin = await User.create({ name: 'Admin User', email: 'admin@hospital.com', password: 'Admin@123', role: 'admin', phone: '9999900000' });

  const staffDefs = [
    ['Dr. Anil Sharma', 'staff1@hospital.com', 'Cardiology', 'Cardiologist', true],
    ['Dr. Priya Mehta', 'staff2@hospital.com', 'Neurology', 'Neurologist', true],
    ['Dr. Rohit Verma', 'staff3@hospital.com', 'Orthopedics', 'Orthopedic Surgeon', true],
    ['Dr. Sunita Rao', 'staff4@hospital.com', 'Pediatrics', 'Pediatrician', true],
    ['Dr. Karan Singh', 'staff5@hospital.com', 'Emergency', 'Emergency Physician', true],
    ['Nurse Kavita Joshi', 'staff6@hospital.com', 'General Medicine', 'Head Nurse', false],
    ['Rajesh Kumar', 'staff7@hospital.com', 'Pharmacy', 'Pharmacist', false],
    ['Meena Gupta', 'staff8@hospital.com', 'Billing & Administration', 'Billing Executive', false],
    ['Suresh Yadav', 'staff9@hospital.com', 'General Medicine', 'Housekeeping Supervisor', false],
  ];
  const staff = [];
  for (const [name, email, dept, designation, isDoctor] of staffDefs) {
    staff.push(await User.create({ name, email, password: 'Staff@123', role: 'staff', department: byName[dept]._id, designation, isDoctor }));
  }

  const patients = [];
  const pNames = ['Amit Patel', 'Neha Kapoor', 'Ramesh Chauhan', 'Pooja Nair', 'Vikram Joshi', 'Anjali Desai', 'Rahul Mishra', 'Sneha Iyer'];
  for (let i = 0; i < pNames.length; i++) {
    patients.push(await User.create({ name: pNames[i], email: i === 0 ? 'patient@hospital.com' : `patient${i + 1}@hospital.com`, password: 'Patient@123', role: 'patient', language: i % 3 === 2 ? 'hi' : 'en' }));
  }

  // Feedback over the last 90 days
  const fbDocs = [];
  for (let i = 0; i < 160; i++) {
    const dept = pick(depts);
    const deptStaff = staff.filter((s) => String(s.department) === String(dept._id));
    const st = deptStaff.length && Math.random() < 0.75 ? pick(deptStaff) : null;
    const r = Math.random();
    const rating = r < 0.55 ? pick([4, 5, 5]) : r < 0.8 ? 3 : pick([1, 2, 2]);
    const comment = rating >= 4 ? pick(POS) : rating === 3 ? pick(NEU) : pick(NEG);
    const sentiment = analyzeSentiment(comment, rating);
    const anon = Math.random() < 0.25;
    const qr = Math.random() < 0.2;
    fbDocs.push({
      patient: qr ? null : pick(patients)._id, department: dept._id, staffMember: st ? st._id : null,
      rating, staffRating: st ? Math.max(1, Math.min(5, rating + pick([-1, 0, 0, 1]))) : undefined,
      comment, visitType: pick(['OPD', 'IPD', 'Emergency', 'Diagnostics', 'Pharmacy']), isAnonymous: anon || qr,
      source: qr ? 'qr' : 'web', sentiment, language: /[ऀ-ॿ]/.test(comment) ? 'hi' : 'en',
      createdAt: daysAgo(rnd(0, 89)),
    });
  }
  await Feedback.insertMany(fbDocs, { timestamps: false });

  // Complaints
  const statuses = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const prios = ['Low', 'Medium', 'Medium', 'High', 'Urgent'];
  for (let i = 0; i < 40; i++) {
    const [title, description] = pick(COMPLAINTS);
    const dept = pick(depts);
    const deptStaff = staff.filter((s) => String(s.department) === String(dept._id));
    const status = pick(statuses);
    const created = daysAgo(rnd(0, 60));
    const priority = pick(prios);
    const assignedTo = status === 'Open' ? null : (deptStaff.length ? pick(deptStaff) : pick(staff))._id;
    const c = new Complaint({
      patient: pick(patients)._id, department: dept._id, title, description, category: categorize(`${title}. ${description}`),
      priority, status, assignedTo, isAnonymous: Math.random() < 0.15, sentiment: analyzeSentiment(`${title}. ${description}`),
      dueAt: slaDue(priority, created), createdAt: created, updatedAt: created,
    });
    c.timeline.push({ action: 'Complaint registered', byName: 'Patient', at: created });
    if (status === 'Resolved' || status === 'Closed') {
      c.resolvedAt = new Date(created.getTime() + rnd(2, 90) * 36e5);
      c.resolutionTimeHours = hoursBetween(created, c.resolvedAt);
      if (Math.random() < 0.7) c.resolutionRating = pick([3, 4, 4, 5, 5, 2]);
      c.responses.push({ authorName: 'Support', authorRole: 'staff', message: 'We have looked into this and resolved the issue. Thank you for letting us know.' });
    }
    if (['Open', 'Assigned', 'In Progress'].includes(status) && c.dueAt < new Date()) { // overdue ones show escalation
      c.escalated = true; c.escalationLevel = 1; c.escalatedAt = new Date();
    }
    await c.save();
  }

  // Service requests
  const types = ['Wheelchair/Stretcher', 'Meal/Diet Request', 'Housekeeping/Cleaning', 'Medical Records', 'Nurse Assistance', 'Billing Assistance'];
  for (let i = 0; i < 18; i++) {
    const status = pick(['Pending', 'Accepted', 'In Progress', 'Completed', 'Completed', 'Cancelled']);
    const created = daysAgo(rnd(0, 20));
    const r = new ServiceRequest({
      patient: pick(patients)._id, type: pick(types), department: pick(depts)._id, location: `Ward ${rnd(1, 6)}, Bed ${rnd(1, 30)}`,
      description: 'Please assist as soon as possible.', priority: pick(['Low', 'Medium', 'High']), status,
      assignedTo: status === 'Pending' ? null : pick(staff)._id, createdAt: created, updatedAt: created,
    });
    r.timeline.push({ status: 'Pending', byName: 'Patient', note: 'Request submitted', at: created });
    if (status === 'Completed') r.completedAt = new Date(created.getTime() + 36e5 * rnd(1, 6));
    await r.save();
  }

  console.log('\nSeed complete. Demo logins:');
  console.log('  Admin   : admin@hospital.com    / Admin@123');
  console.log('  Staff   : staff1@hospital.com   / Staff@123   (Dr. Anil Sharma, Cardiology; staff1..staff9 exist)');
  console.log('  Patient : patient@hospital.com  / Patient@123 (patient2..patient8 also exist)\n');
  void admin;
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
