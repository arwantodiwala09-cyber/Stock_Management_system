import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listLedger, getLedger } from './ledger.controller.js';
const router = Router();
router.use(requireAuth, requireOrganization);
// Ledger is strictly read-only
router.get('/', requirePermission(['ledger.read', 'inventory.read']), listLedger);
router.get('/:id', requirePermission(['ledger.read', 'inventory.read']), getLedger);
export default router;
//# sourceMappingURL=ledger.routes.js.map