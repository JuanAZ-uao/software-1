import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { loginUser, registerUser, getCurrentUser, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../core/middlewares/auth.middleware.js';
import { validateLogin, validateRegister } from '../repositories/auth.validation.js';

const router = Router();

router.post('/login', validateLogin, asyncHandler(loginUser));
router.post('/register', validateRegister, asyncHandler(registerUser));
router.get('/me', asyncHandler(getCurrentUser));
router.get('/verify', requireAuth, asyncHandler((req, res) => {
  // Solo verifica que el token sea válido (requireAuth maneja la validación)
  res.json({ valid: true, user: req.user });
}));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));

export const authRouter = router;