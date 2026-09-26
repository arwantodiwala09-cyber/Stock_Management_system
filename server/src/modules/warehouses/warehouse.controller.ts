import type { Request, Response } from 'express';
import { z } from 'zod';
import { WarehouseService } from './warehouse.service.js';
import { LocationService } from '../locations/location.service.js';
import { getDbClient } from '../../utils/db.js';

const createWarehouseSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  code: z.string().trim().min(1, 'Code is required').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  address: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateWarehouseSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/).optional(),
  address: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

const createLocationInWarehouseSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  code: z.string().trim().min(1, 'Code is required').max(50).regex(/^[A-Za-z0-9_-]+$/),
  type: z.string().trim().max(50).default('storage'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const listWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const db = getDbClient(req);
    const service = new WarehouseService(db);

    const { search, status, page, pageSize, all } = req.query;

    const result = await service.listWarehouses(orgId, {
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? status : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      all: all === 'true',
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('listWarehouses error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch warehouses' });
  }
};

export const getWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const db = getDbClient(req);
    const service = new WarehouseService(db);

    const warehouse = await service.getWarehouseById(orgId, id);
    if (!warehouse) {
      res.status(404).json({ error: 'Warehouse not found' });
      return;
    }

    res.status(200).json(warehouse);
  } catch (error: any) {
    console.error('getWarehouse error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch warehouse' });
  }
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const validation = createWarehouseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new WarehouseService(db);

    const warehouse = await service.createWarehouse(orgId, {
      name: validation.data.name,
      code: validation.data.code,
      address: validation.data.address ?? undefined,
      status: validation.data.status,
    });

    res.status(201).json(warehouse);
  } catch (error: any) {
    if (error.status === 409) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('createWarehouse error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create warehouse' });
  }
};

export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;

    const validation = updateWarehouseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new WarehouseService(db);

    const warehouse = await service.updateWarehouse(orgId, id, {
      name: validation.data.name,
      code: validation.data.code,
      address: validation.data.address ?? undefined,
      status: validation.data.status,
    });

    res.status(200).json(warehouse);
  } catch (error: any) {
    if (error.status === 404 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('updateWarehouse error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update warehouse' });
  }
};

export const getWarehouseLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const db = getDbClient(req);
    const service = new WarehouseService(db);

    const locations = await service.getLocationsForWarehouse(orgId, id);
    res.status(200).json(locations);
  } catch (error: any) {
    if (error.status === 404) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('getWarehouseLocations error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch locations' });
  }
};

export const createWarehouseLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const warehouseId = req.params.id as string;

    const validation = createLocationInWarehouseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const locationService = new LocationService(db);

    const location = await locationService.createLocation(orgId, {
      warehouse_id: warehouseId,
      name: validation.data.name,
      code: validation.data.code,
      type: validation.data.type,
      status: validation.data.status,
    });

    res.status(201).json(location);
  } catch (error: any) {
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('createWarehouseLocation error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create location' });
  }
};
