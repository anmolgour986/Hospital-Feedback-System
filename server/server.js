require('dotenv').config();
const http = require('http');

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');
const { startEscalationJob } = require('./jobs/escalation');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  const server = http.createServer(app);
  initSocket(server);
  startEscalationJob();
  server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
