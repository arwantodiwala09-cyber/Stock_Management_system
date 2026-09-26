import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listAdjustments, getAdjustment, createAdjustment, updateAdjustment, approveAdjustment, } from './adjustment.controller.js';
const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/', requirePermission('adjustments.read'), listAdjustments);
router.get('/:id', requirePermission('adjustments.read'), getAdjustment);
router.post('/', requirePermission('adjustments.create'), createAdjustment);
router.patch('/:id', requirePermission('adjustments.update'), updateAdjustment);
router.post('/:id/approve', requirePermission(['adjustments.approve', 'adjustments.update']), approveAdjustment);
export default router;
//# sourceMappingURL=adjustment.routes.js.map