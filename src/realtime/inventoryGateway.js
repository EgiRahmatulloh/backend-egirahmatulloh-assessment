import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;
let inventoryNamespace = null;
let ordersNamespace = null;

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

const ensureNamespaces = httpServer => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: parseAllowedOrigins(),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  inventoryNamespace = ioInstance.of('/inventory');
  ordersNamespace = ioInstance.of('/orders');

  [inventoryNamespace, ordersNamespace].forEach(namespace => {
    namespace.use(authenticateSocket);
  });

  inventoryNamespace.on('connection', socket => {
    socket.join('inventory');
    socket.emit('inventory:connected', {
      message: 'Terhubung ke pembaruan stok.',
    });
  });

  ordersNamespace.on('connection', socket => {
    const userId = socket.data.user?.id;
    const role = socket.data.user?.role;

    if (userId) {
      socket.join(`orders:user:${userId}`);
    }

    socket.join('orders:all');

    if (role === 'ADMIN') {
      socket.join('orders:admin');
    }

    socket.emit('orders:connected', {
      message: 'Terhubung ke pembaruan pesanan.',
    });
  });

  return ioInstance;
};

export const initRealtimeGateway = httpServer => ensureNamespaces(httpServer);
export const initInventoryGateway = httpServer => ensureNamespaces(httpServer);

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

export const emitOrderEvent = (eventPayload = {}) => {
  if (!ordersNamespace) {
    return;
  }

  const { order, type = 'ORDER_UPDATED' } = eventPayload;

  if (!order || !order.id) {
    return;
  }

  const payload = {
    type,
    order,
  };

  ordersNamespace.to('orders:admin').emit('orders:event', payload);

  if (order.buyerId) {
    ordersNamespace.to(`orders:user:${order.buyerId}`).emit('orders:event', payload);
  }
};

export const emitOrderBulkEvents = events => {
  if (!ordersNamespace || !Array.isArray(events) || events.length === 0) {
    return;
  }

  events.forEach(event => emitOrderEvent(event));
};

export const emitOrderDeletion = ({ orderId, buyerId }) => {
  if (!ordersNamespace || !orderId) {
    return;
  }

  const payload = {
    type: 'ORDER_DELETED',
    order: { id: orderId, buyerId },
  };

  ordersNamespace.to('orders:admin').emit('orders:event', payload);

  if (buyerId) {
    ordersNamespace.to(`orders:user:${buyerId}`).emit('orders:event', payload);
  }
};
