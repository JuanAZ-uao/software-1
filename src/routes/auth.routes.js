import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { 
    loginUser,
    registerUser,
    forgotPassword, 
    resetPassword 
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', asyncHandler(loginUser));
router.post('/register', asyncHandler(registerUser));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));

export const authRouter = router;
import { validateToken } from '../controllers/auth.controller.js';
// ...
router.post('/validate-token', asyncHandler(validateToken));