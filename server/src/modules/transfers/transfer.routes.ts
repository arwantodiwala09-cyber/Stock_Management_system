import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import {
  listTransfers,
  getTransfer,
  createTransfer,
  updateTransfer,
  completeTransfer,
} from './transfer.controller.js';

const router = Router();

router.use(requireAuth, requireOrganization);

router.get('/', requirePermission('transfers.read'), listTransfers);
router.get('/:id', requirePermission('transfers.read'), getTransfer);
router.post('/', requirePermission('transfers.create'), createTransfer);
router.patch('/:id', requirePermission('transfers.update'), updateTransfer);
router.post('/:id/complete', requirePermission(['transfers.complete', 'transfers.update']), completeTransfer);

export default router;
