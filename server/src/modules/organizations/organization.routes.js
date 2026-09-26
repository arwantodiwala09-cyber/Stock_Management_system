import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { createOrganization, getUserOrganizations, getOrganizationMembers } from './organization.controller.js';
const router = Router();
// Routes that require only authentication
router.post('/', requireAuth, createOrganization);
router.get('/', requireAuth, getUserOrganizations);
// Routes that require organization context and specific permissions
router.get('/:id/members', requireAuth, (req, res, next) => {
    // Inject org ID from param into header-like context to re-use middleware if desired,
    // OR we can just pass it directly. Our organization middleware expects it in headers.
    // Let's ensure the client sends x-organization-id for member requests too.
    next();
}, requireOrganization, requirePermission('users.read'), getOrganizationMembers);
export default router;
//# sourceMappingURL=organization.routes.js.map