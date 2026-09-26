import type { Request, Response } from 'express';
import { z } from 'zod';
import { DeliveryService } from './delivery.service.js';
import { getDbClient } from '../../utils/db.js';

const deliveryItemSchema = z.object({
  product_id: z.string().uuid('Valid product ID required'),
  location_id: z.string().uuid('Valid location ID required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
});

const createDeliverySchema = z.object({
  delivery_number: z.string().trim().max(100).optional(),
  customer_info: z.string().trim().max(500).optional().nullable(),
  warehouse_id: z.string().uuid('Valid warehouse ID required'),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(deliveryItemSchema).min(1, 'Delivery must contain at least one line item'),
});

const updateDeliverySchema = z.object({
  customer_info: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(deliveryItemSchema).min(1).optional(),
});

export const listDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const db = getDbClient(req);
    const service = new DeliveryService(db);

    const { search, status, warehouseId, page, pageSize } = req.query;

    const result = await service.listDeliveries(orgId, {
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? status : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('listDeliveries error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch deliveries' });
  }
};

export const getDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const db = getDbClient(req);
    const service = new DeliveryService(db);

    const delivery = await service.getDeliveryById(orgId, id);
    if (!delivery) {
      res.status(404).json({ error: 'Delivery not found' });
      return;
    }

    res.status(200).json(delivery);
  } catch (error: any) {
    console.error('getDelivery error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch delivery' });
  }
};

export const createDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const userId = req.user!.id;

    const validation = createDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new DeliveryService(db);

    const delivery = await service.createDelivery(orgId, userId, {
      delivery_number: validation.data.delivery_number,
      customer_info: validation.data.customer_info ?? undefined,
      warehouse_id: validation.data.warehouse_id,
      notes: validation.data.notes ?? undefined,
      items: validation.data.items,
    });

    res.status(201).json(delivery);
  } catch (error: any) {
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('createDelivery error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create delivery' });
  }
};

export const updateDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;

    const validation = updateDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new DeliveryService(db);

    const delivery = await service.updateDelivery(orgId, id, {
      customer_info: validation.data.customer_info ?? undefined,
      notes: validation.data.notes ?? undefined,
      items: validation.data.items,
    });

    res.status(200).json(delivery);
  } catch (error: any) {
    if (error.status === 400 || error.status === 404) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('updateDelivery error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update delivery' });
  }
};

export const validateDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const userId = req.user!.id;
    const id = req.params.id as string;

    const db = getDbClient(req);
    const service = new DeliveryService(db);

    const result = await service.validateDelivery(orgId, id, userId);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.status === 400 || error.status === 404) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('validateDelivery error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to validate delivery' });
  }
};
