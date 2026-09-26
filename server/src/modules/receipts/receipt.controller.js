import { z } from 'zod';
import { ReceiptService } from './receipt.service.js';
import { getDbClient } from '../../utils/db.js';
const receiptItemSchema = z.object({
    product_id: z.string().uuid('Valid product ID required'),
    location_id: z.string().uuid('Valid location ID required'),
    quantity: z.coerce.number().positive('Quantity must be greater than 0'),
    unit_info: z.string().trim().max(50).optional(),
});
const createReceiptSchema = z.object({
    receipt_number: z.string().trim().max(100).optional(),
    supplier_info: z.string().trim().max(500).optional().nullable(),
    warehouse_id: z.string().uuid('Valid warehouse ID required'),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(receiptItemSchema).min(1, 'Receipt must have at least one line item'),
});
const updateReceiptSchema = z.object({
    supplier_info: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(receiptItemSchema).min(1).optional(),
});
export const listReceipts = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const db = getDbClient(req);
        const service = new ReceiptService(db);
        const { search, status, warehouseId, page, pageSize } = req.query;
        const result = await service.listReceipts(orgId, {
            search: typeof search === 'string' ? search : undefined,
            status: typeof status === 'string' ? status : undefined,
            warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('listReceipts error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch receipts' });
    }
};
export const getReceipt = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new ReceiptService(db);
        const receipt = await service.getReceiptById(orgId, id);
        if (!receipt) {
            res.status(404).json({ error: 'Receipt not found' });
            return;
        }
        res.status(200).json(receipt);
    }
    catch (error) {
        console.error('getReceipt error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch receipt' });
    }
};
export const createReceipt = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const userId = req.user.id;
        const validation = createReceiptSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new ReceiptService(db);
        const receipt = await service.createReceipt(orgId, userId, {
            receipt_number: validation.data.receipt_number,
            supplier_info: validation.data.supplier_info ?? undefined,
            warehouse_id: validation.data.warehouse_id,
            notes: validation.data.notes ?? undefined,
            items: validation.data.items,
        });
        res.status(201).json(receipt);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404 || error.status === 409) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('createReceipt error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to create receipt' });
    }
};
export const updateReceipt = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const validation = updateReceiptSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new ReceiptService(db);
        const receipt = await service.updateReceipt(orgId, id, {
            supplier_info: validation.data.supplier_info ?? undefined,
            notes: validation.data.notes ?? undefined,
            items: validation.data.items,
        });
        res.status(200).json(receipt);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('updateReceipt error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to update receipt' });
    }
};
export const validateReceipt = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const userId = req.user.id;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new ReceiptService(db);
        const result = await service.validateReceipt(orgId, id, userId);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.status === 400 || error.status === 404) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error('validateReceipt error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to validate receipt' });
    }
};
//# sourceMappingURL=receipt.controller.js.map