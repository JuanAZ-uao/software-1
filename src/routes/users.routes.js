import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/user.controller.js';
import { validateCreateUser, validateUpdateUser } from '../repositories/user.validation.js';

const router = Router();

router.get('/', asyncHandler(listUsers));
router.get('/:id', asyncHandler(getUser));
router.post('/', validateCreateUser, asyncHandler(createUser));
router.put('/:id', validateUpdateUser, asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));

export const usuariosRouter = router;