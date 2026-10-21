# Hospital Patient Feedback & Service Management System (MERN)

Mobile-first web app where **patients** give feedback, register complaints and request hospital services,
**staff** resolve them, and **admins** manage people, departments, analytics and reports.

Stack: **MongoDB · Express · React (Vite) · Node.js** — plus Socket.IO (real-time), Nodemailer (email), PDFKit (reports),
node-cron (auto-escalation), i18next (English/Hindi), Recharts (charts).

## Quick start
```bash
# 1. prerequisites: Node 18+ and a running MongoDB (local or Atlas)
npm run install:all
cp server/.env.example server/.env      # then set MONGO_URI and a long random JWT_SECRET
npm run seed                            # demo data (WIPES the database)
# 2. development (two terminals)
npm run server                          # API  -> http://localhost:5000
npm run client                          # UI   -> http://localhost:5173
# or production: one server serves the built UI
npm start                               # -> http://localhost:5000
```
Demo logins (after seeding): `staff1@hospital.com / Staff@123`, `patient@hospital.com / Patient@123` on the **Patient / Staff** tab of the login page;
administrator `admin@hospital.com / Admin@123` on the **Admin** tab (admins cannot sign in on the Patient/Staff tab, and patients/staff are refused on the Admin tab).
Create your own admin any time: `cd server && npm run create-admin -- "Your Name" you@example.com "StrongPass123"`.

Email: leave `SMTP_*` empty in development (emails are printed to the console, and the password-reset link is shown on screen).
For real email set `SMTP_HOST/PORT/USER/PASS`.

## Feature map
| Requirement | Where |
|---|---|
| Registration / login, password reset | `authController`, `/register`, `/forgot-password`, `/reset-password/:token` |
| Role-based access (Patient/Staff/Admin) | `middleware/auth.js` (`protect`, `authorize`) + `RequireAuth/Roles` in `App.jsx` |
| 3 dashboards | `pages/Dashboard.jsx` (patient / staff / admin views) |
| Feedback, star rating, doctor & staff ratings, department-wise | `FeedbackNew`, `feedbackController`, `/analytics/departments` |
| Anonymous feedback & complaints | `isAnonymous` flag; identity masked for staff/admin (incl. replies/timeline) |
| Feedback history, search & filters | `FeedbackList`, `Complaints` |
| Complaints: priority, assignment, responses, resolution, status tracking | `complaintController`, `ComplaintDetail` |
| Service requests + status tracking | `requestController`, `Requests` |
| Real-time + email notifications | `utils/socket.js`, `utils/notify.js`, `utils/mailer.js` |
| Automatic escalation (SLA 72/48/24/8 h) | `jobs/escalation.js` (cron, manual run for admin) |
| AI sentiment analysis (EN + Hindi/Hinglish) | `utils/sentiment.js` |
| Automatic categorisation + urgency detection | `utils/categorize.js` |
| Charts, trends, satisfaction score, resolution time | `Analytics`, `analyticsController` |
| Department & staff performance, PDF reports | `Performance`, `Reports`, `routes/reports.js` |
| QR-code feedback (no login) | `QRCodes`, `/feedback/public`, `/api/public/feedback` |
| English / Hindi | `client/src/i18n.js`, language button in the top bar |
| User & department management | `Users`, `Departments` |
| Privacy & security | bcrypt, JWT, helmet, rate-limit, NoSQL sanitising, account lockout, audit log (`Security`), data export / erase (`Profile`) |

## Testing
`npm test` runs 20 end-to-end API tests (auth, RBAC, anonymity, escalation, analytics, PDFs, privacy, ...) against
a separate database `hospital_feedback_test` (override with `MONGO_URI_TEST`). Requires MongoDB running.

## Notes
* PDF reports use built-in Latin fonts, so Hindi text in PDFs is replaced by `?` (the app itself fully supports Hindi).
* Sentiment analysis is lexicon-based (explainable, no external API needed); it can be swapped for an ML service in `utils/sentiment.js`.
