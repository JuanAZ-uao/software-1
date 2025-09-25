import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser
} from './user.controller.js';
import { validateCreateUser, validateUpdateUser } from './user.validation.js';
import { loginUser, getCurrentUser } from '../auth/auth.controller.js';

const router = Router();

router.get('/', asyncHandler(listUsers));
router.get('/:id', asyncHandler(getUser));
router.post('/', validateCreateUser, asyncHandler(createUser));
router.put('/:id', validateUpdateUser, asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));
router.post('/login', asyncHandler(loginUser));
router.get('/me', asyncHandler(getCurrentUser));

export const usersRouter = router;
