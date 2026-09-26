import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
} from './product.controller.js';

const router = Router();

router.use(requireAuth, requireOrganization);

router.get('/', requirePermission('products.read'), listProducts);
router.get('/:id', requirePermission('products.read'), getProduct);
router.post('/', requirePermission('products.create'), createProduct);
router.patch('/:id', requirePermission('products.update'), updateProduct);
router.post('/upload-image', requirePermission('products.create'), uploadProductImage);

export default router;
