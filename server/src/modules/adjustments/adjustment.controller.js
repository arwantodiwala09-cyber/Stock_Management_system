import { z } from 'zod';
import { AdjustmentService } from './adjustment.service.js';
import { getDbClient } from '../../utils/db.js';
const adjustmentItemSchema = z.object({
    product_id: z.string().uuid('Valid product ID required'),
    location_id: z.string().uuid('Valid location ID required'),
    physical_quantity: z.coerce.number().min(0, 'Physical quantity must be >= 0'),
});
const createAdjustmentSchema = z.object({
    adjustment_number: z.string().trim().max(100).optional(),
    warehouse_id: z.string().uuid('Valid warehouse ID required'),
    reason: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(adjustmentItemSchema).min(1, 'Adjustment must contain at least one line item'),
});
const updateAdjustmentSchema = z.object({
    reason: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(adjustmentItemSchema).min(1).optional(),
});
export const listAdjustments = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const db = getDbClient(req);
        const service = new AdjustmentService(db);
        const { search, status, warehouseId, page, pageSize } = req.query;
        const result = await service.listAdjustments(orgId, {
            search: typeof search === 'string' ? search : undefined,
            status: typeof status === 'string' ? status : undefined,
            warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('listAdjustments error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch adjustments' });
    }
};
export const getAdjustment = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new AdjustmentService(db);
        const adjustment = await service.getAdjustmentById(orgId, id);
        if (!adjustment) {
            res.status(404).json({ error: 'Adjustment not found' });
            return;
        }
        res.status(200).json(adjustment);
    }
    catch (error) {
        console.error('getAdjustment error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch adjustment' });
    }
};
export const createAdjustment = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const userId = req.user.id;
        const validation = createAdjustmentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new AdjustmentService(db);
        const adjustment = await service.createAdjustment(orgId, userId, {
            adjustment_number: validation.data.adjustment_number,
            warehouse_id: validation.data.warehouse_id,
            reason: validation.data.reason ?? undefined,
            notes: validation.data.notes ?? undefined,
            items: validation.data.items,
        });
        res.status(201).json(adjustment);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404 || error.status === 409) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('createAdjustment error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to create adjustment' });
    }
};
export const updateAdjustment = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const validation = updateAdjustmentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new AdjustmentService(db);
        const adjustment = await service.updateAdjustment(orgId, id, {
            reason: validation.data.reason ?? undefined,
            notes: validation.data.notes ?? undefined,
            items: validation.data.items,
        });
        res.status(200).json(adjustment);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('updateAdjustment error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to update adjustment' });
    }
};
export const approveAdjustment = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const userId = req.user.id;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new AdjustmentService(db);
        const result = await service.approveAdjustment(orgId, id, userId);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('approveAdjustment error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to approve adjustment' });
    }
};
//# sourceMappingURL=adjustment.controller.js.map