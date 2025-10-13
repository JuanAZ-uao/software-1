import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { loginUser, registerUser, getCurrentUser, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validateLogin, validateRegister } from '../repositories/auth.validation.js';

const router = Router();

router.post('/login', validateLogin, asyncHandler(loginUser));
router.post('/register', validateRegister, asyncHandler(registerUser));
router.get('/me', asyncHandler(getCurrentUser));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));

export const authRouter = router;