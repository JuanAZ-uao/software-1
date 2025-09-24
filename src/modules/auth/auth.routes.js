// src/modules/auth/auth.routes.js
import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import { loginUser, getCurrentUser } from './auth.controller.js';

const router = Router();
router.post('/login', asyncHandler(loginUser));
router.get('/me', asyncHandler(getCurrentUser));

export const authRouter = router;