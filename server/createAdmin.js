// Create (or promote) an administrator account.
// Usage:  npm run create-admin -- "Full Name" admin@example.com "StrongPass123"
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

const [name, email, password] = process.argv.slice(2);

(async () => {
  if (!name || !email || !password) {
    console.error('Usage: npm run create-admin -- "Full Name" admin@example.com "Password123"');
    process.exit(1);
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error('Password must be at least 8 characters with a letter and a number.');
    process.exit(1);
  }
  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    existing.isActive = true;
    existing.password = password;
    await existing.save();
    console.log(`Existing user ${existing.email} is now an admin (password updated).`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})().catch(async (e) => { console.error(e.message); await mongoose.disconnect(); process.exit(1); });
