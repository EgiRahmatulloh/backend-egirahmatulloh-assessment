import 'dotenv/config';
import express from 'express';
import cors from './config/cors.js';
import allRoutes from './routes/index.js';
import { stripeWebhookHandler } from './controllers/paymentController.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors);
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);
app.use(express.json());

app.use('/api', allRoutes);

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
