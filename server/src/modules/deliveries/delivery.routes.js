import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listDeliveries, getDelivery, createDelivery, updateDelivery, validateDelivery, } from './delivery.controller.js';
const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/', requirePermission('deliveries.read'), listDeliveries);
router.get('/:id', requirePermission('deliveries.read'), getDelivery);
router.post('/', requirePermission('deliveries.create'), createDelivery);
router.patch('/:id', requirePermission('deliveries.update'), updateDelivery);
router.post('/:id/validate', requirePermission('deliveries.validate'), validateDelivery);
export default router;
//# sourceMappingURL=delivery.routes.js.map