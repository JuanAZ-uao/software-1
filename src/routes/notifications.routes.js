import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', asyncHandler(getNotifications));
router.patch('/:id/read', asyncHandler(markAsRead));
router.patch('/mark-all-read', asyncHandler(markAllAsRead));

export const notificationsRouter = router;