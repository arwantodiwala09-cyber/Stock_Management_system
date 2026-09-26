import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listLocations, getLocation, createLocation, updateLocation, } from './location.controller.js';
const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/', requirePermission('warehouses.read'), listLocations);
router.get('/:id', requirePermission('warehouses.read'), getLocation);
router.post('/', requirePermission('warehouses.create'), createLocation);
router.patch('/:id', requirePermission('warehouses.update'), updateLocation);
export default router;
//# sourceMappingURL=location.routes.js.map