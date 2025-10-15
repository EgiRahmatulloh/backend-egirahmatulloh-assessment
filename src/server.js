import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from './config/cors.js';
import allRoutes from './routes/index.js';
import { stripeWebhookHandler } from './controllers/paymentController.js';
import { initInventoryGateway } from './realtime/inventoryGateway.js';

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);

app.use(cors);
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);
app.use(express.json());

app.use('/api', allRoutes);

initInventoryGateway(server);

server.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
