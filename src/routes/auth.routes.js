import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { 
    loginUser,
    registerUser,
    forgotPassword, 
    resetPassword,
    validateToken,
    getCurrentUser,
    updateProfile,
    changePassword
} from '../controllers/auth.controller.js';
import { 
    validateLogin, 
    validateRegister,
    validateUpdateProfile,
    validateChangePassword
} from '../repositories/auth.validation.js';

const router = Router();

router.post('/login', validateLogin, asyncHandler(loginUser));
router.post('/register', validateRegister, asyncHandler(registerUser));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/validate-token', asyncHandler(validateToken));

// Nuevas rutas que faltan
router.get('/me', asyncHandler(getCurrentUser));
router.put('/profile', validateUpdateProfile, asyncHandler(updateProfile));
router.put('/password', validateChangePassword, asyncHandler(changePassword));

export const authRouter = router;