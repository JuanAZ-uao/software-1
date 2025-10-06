import { Router } from 'express';
import * as orgController from '../controllers/organizations.controller.js';

const router = Router();

router.get('/', orgController.getAllOrganizations);
router.post('/', orgController.createOrganization);
router.put('/:id', orgController.updateOrganization);
router.delete('/:id', orgController.deleteOrganization);

export { router as organizationsRouter };