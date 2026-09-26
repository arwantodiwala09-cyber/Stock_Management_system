import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listStock } from './stock.controller.js';

const router = Router();

router.use(requireAuth, requireOrganization);

// Stock view is read-only. Requires inventory.read or products.read.
router.get('/', requirePermission(['inventory.read', 'products.read']), listStock);

export default router;
