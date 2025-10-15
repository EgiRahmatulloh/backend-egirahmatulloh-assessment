import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getMe, register, login, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

router.get('/me', authenticateToken, getMe);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

export default router;
