const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(server) {
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
  io = new Server(server, { cors: { origin: origins, credentials: true } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(payload.id);
      socket.role = payload.role;
      next();
    } catch (e) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.role}`);
  });
  return io;
}

const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user:${String(userId)}`).emit(event, payload);
};

module.exports = { initSocket, emitToUser };
