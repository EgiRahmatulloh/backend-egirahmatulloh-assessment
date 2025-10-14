import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/addressController.js';

const router = express.Router();

// All address routes are protected
router.use(authenticateToken);

router.get('/', getAllAddresses);
router.post('/', createAddress);
router.put('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);

export default router;
