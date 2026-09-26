import { z } from 'zod';
import { TransferService } from './transfer.service.js';
import { getDbClient } from '../../utils/db.js';
const transferItemSchema = z.object({
    product_id: z.string().uuid('Valid product ID required'),
    source_location_id: z.string().uuid('Valid source location ID required'),
    destination_location_id: z.string().uuid('Valid destination location ID required'),
    quantity: z.coerce.number().positive('Quantity must be greater than 0'),
});
const createTransferSchema = z.object({
    transfer_number: z.string().trim().max(100).optional(),
    source_warehouse_id: z.string().uuid('Valid source warehouse ID required'),
    destination_warehouse_id: z.string().uuid('Valid destination warehouse ID required'),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(transferItemSchema).min(1, 'Transfer must contain at least one line item'),
});
const updateTransferSchema = z.object({
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(transferItemSchema).min(1).optional(),
});
export const listTransfers = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const db = getDbClient(req);
        const service = new TransferService(db);
        const { search, status, sourceWarehouseId, destinationWarehouseId, page, pageSize } = req.query;
        const result = await service.listTransfers(orgId, {
            search: typeof search === 'string' ? search : undefined,
            status: typeof status === 'string' ? status : undefined,
            sourceWarehouseId: typeof sourceWarehouseId === 'string' ? sourceWarehouseId : undefined,
            destinationWarehouseId: typeof destinationWarehouseId === 'string' ? destinationWarehouseId : undefined,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('listTransfers error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch transfers' });
    }
};
export const getTransfer = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new TransferService(db);
        const transfer = await service.getTransferById(orgId, id);
        if (!transfer) {
            res.status(404).json({ error: 'Transfer not found' });
            return;
        }
        res.status(200).json(transfer);
    }
    catch (error) {
        console.error('getTransfer error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch transfer' });
    }
};
export const createTransfer = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const userId = req.user.id;
        const validation = createTransferSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new TransferService(db);
        const transfer = await service.createTransfer(orgId, userId, {
            transfer_number: validation.data.transfer_number,
            source_warehouse_id: validation.data.source_warehouse_id,
            destination_warehouse_id: validation.data.destination_warehouse_id,
            notes: validation.data.notes ?? undefined,
            items: validation.data.items,
        });
        res.status(201).json(transfer);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404 || error.status === 409) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('createTransfer error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to create transfer' });
    }
};
export const updateTransfer = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const validation = updateTransferSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new TransferService(db);
        const transfer = await service.updateTransfer(orgId, id, {
            notes: validation.data.notes ?? undefined,
            items: validation.data.items,
        });
        res.status(200).json(transfer);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('updateTransfer error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to update transfer' });
    }
};
export const completeTransfer = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const userId = req.user.id;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new TransferService(db);
        const result = await service.completeTransfer(orgId, id, userId);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('completeTransfer error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to complete transfer' });
    }
};
//# sourceMappingURL=transfer.controller.js.map