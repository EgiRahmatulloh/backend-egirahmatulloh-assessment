
import 'dotenv/config';
import express from 'express';
import { db } from './db.js';
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

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);

// Endpoint untuk mengambil semua produk
app.get('/api/products', async (req, res) => {
  try {
    const productsFromDb = await db.product.findMany({
      include: {
        variants: {
          include: {
            reviews: true,
          },
        },
        category: true,
      },
    });

    const formattedProducts = productsFromDb.map(p => {
      const mainVariant = p.variants[0];
      if (!mainVariant) return null;

      const reviews = mainVariant.reviews || [];
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;
      const reviewCount = reviews.length;

      let brand = 'Unknown';
      try {
        const attributes = JSON.parse(mainVariant.attributes);
        brand = attributes.brand || 'Unknown';
      } catch (e) {
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: mainVariant.price,
        image: mainVariant.image,
        category: p.category.name,
        brand: brand,
        rating: avgRating,
        reviewCount: reviewCount,
      };
    }).filter(p => p !== null);

    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});


app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

