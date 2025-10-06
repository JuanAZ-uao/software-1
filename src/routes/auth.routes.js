import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', validateLogin, asyncHandler(loginUser));
router.post('/register', validateRegister, asyncHandler(registerUser));
router.get('/me', asyncHandler(getCurrentUser));
router.post('/logout', asyncHandler(logoutUser));

export const authRouter = router;
import { forgotPassword, resetPassword } from '../controllers/auth.controller.js';
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
