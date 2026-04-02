import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { registerValidation, loginValidation } from '../utils/validators';
import { validateRequest } from '../middleware/errorHandler.middleware';

const router = Router();

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/refresh', refreshToken);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.post('/logout', authMiddleware, logout);

export default router;
