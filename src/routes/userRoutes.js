import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { updateUserProfile } from '../controllers/userController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All user routes will be protected
router.use(authenticateToken);

router.put('/me', upload.single('avatar'), updateUserProfile);

export default router;
