import type { Request, Response } from 'express';
import { z } from 'zod';
import { LocationService } from './location.service.js';
import { getDbClient } from '../../utils/db.js';

const createLocationSchema = z.object({
  warehouse_id: z.string().uuid('Valid warehouse ID required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  code: z.string().trim().min(1, 'Code is required').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  type: z.string().trim().max(50).default('storage'),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateLocationSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/).optional(),
  type: z.string().trim().max(50).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const listLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const db = getDbClient(req);
    const service = new LocationService(db);

    const { warehouseId, search, status, page, pageSize, all } = req.query;

    const result = await service.listLocations(orgId, {
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? status : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      all: all === 'true',
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('listLocations error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch locations' });
  }
};

export const getLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const db = getDbClient(req);
    const service = new LocationService(db);

    const location = await service.getLocationById(orgId, id);
    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.status(200).json(location);
  } catch (error: any) {
    console.error('getLocation error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch location' });
  }
};

export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const validation = createLocationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new LocationService(db);

    const location = await service.createLocation(orgId, {
      warehouse_id: validation.data.warehouse_id,
      name: validation.data.name,
      code: validation.data.code,
      type: validation.data.type,
      status: validation.data.status,
    });

    res.status(201).json(location);
  } catch (error: any) {
    if (error.status === 400 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('createLocation error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create location' });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;

    const validation = updateLocationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new LocationService(db);

    const location = await service.updateLocation(orgId, id, {
      name: validation.data.name,
      code: validation.data.code,
      type: validation.data.type,
      status: validation.data.status,
    });

    res.status(200).json(location);
  } catch (error: any) {
    if (error.status === 404 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('updateLocation error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update location' });
  }
};
