import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOrganization } from '../../middleware/organization.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  getWarehouseLocations,
  createWarehouseLocation,
} from './warehouse.controller.js';

const router = Router();

router.use(requireAuth, requireOrganization);

router.get('/', requirePermission('warehouses.read'), listWarehouses);
router.get('/:id', requirePermission('warehouses.read'), getWarehouse);
router.post('/', requirePermission('warehouses.create'), createWarehouse);
router.patch('/:id', requirePermission('warehouses.update'), updateWarehouse);

// Locations belonging to warehouse
router.get('/:id/locations', requirePermission('warehouses.read'), getWarehouseLocations);
router.post('/:id/locations', requirePermission('warehouses.create'), createWarehouseLocation);

export default router;
