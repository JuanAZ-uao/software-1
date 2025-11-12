import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { requireAuth } from '../core/middlewares/auth.middleware.js';
import * as ctrl from '../controllers/notifications.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/notifications - obtener mis notificaciones
router.get('/', asyncHandler(ctrl.getMyNotifications));

// GET /api/notifications/unread-count - obtener conteo de no leídas
router.get('/unread-count', asyncHandler(ctrl.getUnreadCount));

// PATCH /api/notifications/:id/read - marcar como leída
router.patch('/:id/read', asyncHandler(ctrl.markAsRead));

// DELETE /api/notifications/:id - eliminar notificación
router.delete('/:id', asyncHandler(ctrl.deleteNotification));

// PATCH /api/notifications/mark-all-read - marcar todas como leídas (legacy)
router.patch('/mark-all-read', asyncHandler(ctrl.markAllAsRead));

export const notificationsRouter = router;