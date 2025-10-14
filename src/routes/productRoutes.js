import express from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getAllProducts,
  searchProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/admin', authenticateToken, requireAdmin, getAdminProducts);
router.post('/', authenticateToken, requireAdmin, upload.single('image'), createProduct);
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

export default router;
