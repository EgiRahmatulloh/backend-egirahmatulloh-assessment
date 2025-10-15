import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getOrderHistory,
  getOrderById,
  createOrder,
  getAllOrders,
  updateOrderStatus,
  requestPaymentIntent,
} from '../controllers/orderController.js';

const router = express.Router();

// All order routes are protected
router.use(authenticateToken);

// Admin route to get all orders
router.get('/all', requireAdmin, getAllOrders);

router.get('/', getOrderHistory);
router.post('/:orderId/payment-intent', requestPaymentIntent);
router.get('/:orderId', getOrderById);
router.post('/', createOrder);

// Admin route to update order status
router.put('/:orderId/status', requireAdmin, updateOrderStatus);

export default router;
