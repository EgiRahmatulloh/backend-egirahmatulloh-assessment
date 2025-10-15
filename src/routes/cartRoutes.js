import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getOrCreateCart } from '../middleware/cart.js';
import {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
} from '../controllers/cartController.js';

const router = express.Router();

// All cart routes will be protected and will have access to the user's cart
router.use(authenticateToken, getOrCreateCart);

router.get('/', getCart);
router.post('/items', addCartItem);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', deleteCartItem);

export default router;
