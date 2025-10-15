
import express from 'express';
import { getDashboardStats, getSalesOverview, getRecentSales } from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateToken, requireAdmin, getDashboardStats);
router.get('/stats/overview', authenticateToken, requireAdmin, getSalesOverview);
router.get('/stats/recent-sales', authenticateToken, requireAdmin, getRecentSales);

export default router;
