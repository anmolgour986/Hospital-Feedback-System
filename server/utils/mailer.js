const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true }); // dev: no real email
  }
  return transporter;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendEmail({ to, subject, text, html }) {
  try {
    const body =
      html ||
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#0f766e;margin-top:0">Hospital Feedback System</h2>
        <p style="white-space:pre-line;color:#0f172a">${esc(text)}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0"/>
        <p style="color:#64748b;font-size:12px">This is an automated message. Please do not reply.</p></div>`;
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'Hospital Feedback <no-reply@hospital.local>',
      to,
      subject,
      text,
      html: body,
    });
    if (!process.env.SMTP_HOST) console.log(`[email:dev] to=${to} subject="${subject}"`);
    return info;
  } catch (err) {
    console.error('Email failed:', err.message);
    return null;
  }
}

module.exports = { sendEmail };
