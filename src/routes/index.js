import express from 'express';
import authRoutes from './authRoutes.js';
import cartRoutes from './cartRoutes.js';
import userRoutes from './userRoutes.js';
import addressRoutes from './addressRoutes.js';
import orderRoutes from './orderRoutes.js';
import productRoutes from './productRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.use('/users', userRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);
router.use('/admin', adminRoutes);

export default router;
