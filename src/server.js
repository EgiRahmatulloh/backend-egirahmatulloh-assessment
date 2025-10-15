import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from './config/cors.js';
import allRoutes from './routes/index.js';
import { stripeWebhookHandler } from './controllers/paymentController.js';
import { initInventoryGateway } from './realtime/inventoryGateway.js';

import helmet from 'helmet';

const app = express();
app.use(helmet());
const port = process.env.PORT || 3000;
const server = createServer(app);

app.use(cors);
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);
app.use(express.json());

import apiLimiter from './middleware/rateLimiter.js';

app.use('/api', apiLimiter, allRoutes);

initInventoryGateway(server);

import errorHandler from './middleware/errorHandler.js';

app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
