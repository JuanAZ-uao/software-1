import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import {
    createUser,
    deleteUser,
    getUser,
    listUsers,
    updateUser,
    updateProfile,
    changePassword
} from '../controllers/user.controller.js';
import { validateCreateUser, validateUpdateUser } from '../repositories/user.validation.js';
import { loginUser, getCurrentUser } from '../controllers/auth.controller.js';

const router = Router();

router.get('/', asyncHandler(listUsers));
router.get('/:id', asyncHandler(getUser));
router.post('/', validateCreateUser, asyncHandler(createUser));
router.put('/:id', validateUpdateUser, asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));
router.post('/login', asyncHandler(loginUser));
router.get('/me', asyncHandler(getCurrentUser));

// Nuevas rutas para perfil
router.put('/profile/update', asyncHandler(updateProfile));
router.put('/profile/password', asyncHandler(changePassword));

export const usersRouter = router;