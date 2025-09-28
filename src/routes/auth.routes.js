import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { loginUser, registerUser, getCurrentUser } from '../controllers/auth.controller.js';
import { validateLogin, validateRegister } from '../repositories/auth.validation.js';

const router = Router();

router.post('/login', validateLogin, asyncHandler(loginUser));
router.post('/register', validateRegister, asyncHandler(registerUser));
router.get('/me', asyncHandler(getCurrentUser));

export const authRouter = router;
