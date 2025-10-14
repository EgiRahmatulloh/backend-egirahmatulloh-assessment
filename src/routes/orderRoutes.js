import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getOrderHistory,
  getOrderById,
  createOrder,
} from '../controllers/orderController.js';

const router = express.Router();

// All order routes are protected
router.use(authenticateToken);

router.get('/', getOrderHistory);
router.get('/:orderId', getOrderById);
router.post('/', createOrder);

export default router;
