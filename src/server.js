
import 'dotenv/config';
import express from 'express';
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS Middleware - Izinkan akses dari frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ganti dengan domain frontend Anda di produksi
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Tangani preflight request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

import authRoutes from './auth.js';
import cartRoutes from './cart.js';
import userRoutes from './user.js';
import addressRoutes from './address.js';
import orderRoutes from './order.js';
import productRoutes from './product.js';

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);


app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

