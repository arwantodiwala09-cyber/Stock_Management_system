import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { listCategories, getCategory, createCategory, updateCategory, } from './category.controller.js';
const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/', requirePermission('categories.read'), listCategories);
router.get('/:id', requirePermission('categories.read'), getCategory);
router.post('/', requirePermission('categories.create'), createCategory);
router.patch('/:id', requirePermission('categories.update'), updateCategory);
export default router;
//# sourceMappingURL=category.routes.js.map