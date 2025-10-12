
import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS Middleware - Izinkan akses dari frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ganti dengan domain frontend Anda di produksi
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

import authRoutes from './auth.js';

app.use('/api/auth', authRoutes);

// Endpoint untuk mengambil semua produk
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true, // Sertakan varian produk
        category: true, // Sertakan kategori
      },
    });

    // Ubah struktur data agar sesuai dengan yang mungkin diharapkan frontend
    // atau biarkan frontend yang menyesuaikan. Untuk saat ini, kita kirim data mentah.
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});


app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

