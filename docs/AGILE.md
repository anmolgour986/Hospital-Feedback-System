# Agile Project Notes (for the report)

**Product vision:** a single place where patients' voices turn into measurable service improvements.

## Roles / personas
Patient (Amit, 34, uses a phone) · Staff (Nurse/Doctor/Billing) · Admin (Quality manager)

## Product backlog (epics → example user stories)
1. **Accounts & security** – As a patient I can register/login/reset my password; as an admin I control roles and see an audit log.
2. **Feedback** – As a patient I can rate a department and doctor with stars, optionally anonymously, also via a QR code.
3. **Complaints** – As a patient I can register a complaint and track it; as admin I can assign it; as staff I can reply and resolve it.
4. **Service requests** – As a patient I can request a wheelchair/meal/etc. and track its status.
5. **Notifications** – As any user I get real-time and email updates.
6. **Automation / AI** – The system detects sentiment, category, urgency and escalates overdue complaints.
7. **Analytics & reports** – As an admin I see trends, satisfaction score, department/staff performance and export PDFs.
8. **Localisation** – As a Hindi speaker I can use the app in Hindi.

## Sprint plan (2-week sprints)
| Sprint | Goal | Increment |
|---|---|---|
| 1 | Foundation | Auth, RBAC, departments/users, seed data |
| 2 | Core feedback | Feedback + ratings, history, anonymous, QR |
| 3 | Complaints | Complaints, priority, assignment, responses, resolution |
| 4 | Requests & notifications | Service requests, real-time + email |
| 5 | Intelligence | Sentiment, categorisation, SLA escalation |
| 6 | Insight | Dashboards, charts, reports (PDF), Hindi, hardening & testing |

## Definition of Done
Code reviewed · API test passes (`npm test`) · responsive at 360px · no console errors · documented.

## Testing summary
20 automated API tests + browser smoke test of every page for all 3 roles at mobile (390px) and desktop widths.
