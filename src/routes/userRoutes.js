import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { updateUserProfile } from '../controllers/userController.js';

const router = express.Router();

// All user routes will be protected
router.use(authenticateToken);

router.put('/me', updateUserProfile);

export default router;
