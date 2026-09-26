import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listReceipts, getReceipt, createReceipt, updateReceipt, validateReceipt, } from './receipt.controller.js';
const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/', requirePermission('receipts.read'), listReceipts);
router.get('/:id', requirePermission('receipts.read'), getReceipt);
router.post('/', requirePermission('receipts.create'), createReceipt);
router.patch('/:id', requirePermission('receipts.update'), updateReceipt);
router.post('/:id/validate', requirePermission('receipts.validate'), validateReceipt);
export default router;
//# sourceMappingURL=receipt.routes.js.map