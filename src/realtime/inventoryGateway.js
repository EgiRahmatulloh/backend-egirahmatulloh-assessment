import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let inventoryNamespace = null;

const parseAllowedOrigins = () => {
  const configured = process.env.SOCKET_ALLOWED_ORIGINS;
  if (!configured) {
    return '*';
  }

  const origins = configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : '*';
};

const authenticateSocket = (socket, next) => {
  const tokenFromAuthHeader = socket.handshake.headers?.authorization;
  const bearerToken = tokenFromAuthHeader?.startsWith('Bearer ')
    ? tokenFromAuthHeader.substring(7)
    : null;

  const token = socket.handshake.auth?.token || bearerToken;

  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = {
      id: payload.userId,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return next(new Error('UNAUTHORIZED'));
  }
};

export const initInventoryGateway = httpServer => {
  const io = new Server(httpServer, {
    cors: {
      origin: parseAllowedOrigins(),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  inventoryNamespace = io.of('/inventory');
  inventoryNamespace.use(authenticateSocket);

  inventoryNamespace.on('connection', socket => {
    socket.join('inventory');
    socket.emit('inventory:connected', {
      message: 'Terhubung ke pembaruan stok.',
    });
  });

  return io;
};

export const emitInventoryUpdate = update => {
  if (!inventoryNamespace) {
    return;
  }
  inventoryNamespace.to('inventory').emit('inventory:update', update);
};

export const emitInventoryBulkUpdate = updates => {
  if (!inventoryNamespace || !Array.isArray(updates) || updates.length === 0) {
    return;
  }
  inventoryNamespace.to('inventory').emit('inventory:bulk', updates);
};
