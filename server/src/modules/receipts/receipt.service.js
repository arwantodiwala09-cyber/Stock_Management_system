import { generateDocumentNumber } from '../../utils/numbering.js';
export class ReceiptService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listReceipts(orgId, params) {
        let query = this.db
            .from('receipts')
            .select('*, warehouses(id, name, code), receipt_items(id, quantity)', { count: 'exact' })
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        if (params.warehouseId && params.warehouseId !== 'all') {
            query = query.eq('warehouse_id', params.warehouseId);
        }
        if (params.search && params.search.trim()) {
            const s = params.search.trim();
            query = query.or(`receipt_number.ilike.%${s}%,supplier_info.ilike.%${s}%`);
        }
        const page = Math.max(1, params.page || 1);
        const pageSize = Math.min(100, Math.max(1, params.pageSize || 15));
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);
        const { data, count, error } = await query;
        if (error)
            throw error;
        const items = (data || []).map((r) => {
            const itemCount = (r.receipt_items || []).length;
            const totalQuantity = (r.receipt_items || []).reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
            return {
                ...r,
                item_count: itemCount,
                total_quantity: totalQuantity,
                receipt_items: undefined,
            };
        });
        const total = count || 0;
        return {
            items,
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async getReceiptById(orgId, id) {
        const { data: receipt, error } = await this.db
            .from('receipts')
            .select('*, warehouses(id, name, code)')
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (error)
            throw error;
        if (!receipt)
            return null;
        const { data: items, error: itemsError } = await this.db
            .from('receipt_items')
            .select('*, products(id, name, sku, unit_of_measure), locations(id, name, code, type)')
            .eq('receipt_id', id);
        if (itemsError)
            throw itemsError;
        return {
            ...receipt,
            items: items || [],
        };
    }
    async createReceipt(orgId, userId, dto) {
        // 1. Verify warehouse belongs to current organization
        const { data: warehouse } = await this.db
            .from('warehouses')
            .select('id, name')
            .eq('id', dto.warehouse_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!warehouse) {
            const err = new Error('Warehouse not found in current organization');
            err.status = 400;
            throw err;
        }
        // 2. Validate items
        if (!dto.items || dto.items.length === 0) {
            const err = new Error('Receipt must contain at least one line item');
            err.status = 400;
            throw err;
        }
        for (const item of dto.items) {
            if (item.quantity <= 0) {
                const err = new Error('Item quantity must be greater than zero');
                err.status = 400;
                throw err;
            }
            // Verify product belongs to org
            const { data: product } = await this.db
                .from('products')
                .select('id')
                .eq('id', item.product_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!product) {
                const err = new Error(`Invalid product: Product ${item.product_id} does not belong to the current organization`);
                err.status = 400;
                throw err;
            }
            // Verify location belongs to org and this warehouse
            const { data: location } = await this.db
                .from('locations')
                .select('id')
                .eq('id', item.location_id)
                .eq('warehouse_id', dto.warehouse_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!location) {
                const err = new Error(`Invalid location: Location ${item.location_id} does not belong to the selected warehouse`);
                err.status = 400;
                throw err;
            }
        }
        // 3. Document number
        const receiptNumber = dto.receipt_number?.trim() ||
            await generateDocumentNumber(this.db, 'receipts', 'receipt_number', orgId, 'REC');
        // 4. Insert receipt
        const { data: receipt, error: rError } = await this.db
            .from('receipts')
            .insert({
            organization_id: orgId,
            receipt_number: receiptNumber,
            warehouse_id: dto.warehouse_id,
            supplier_info: dto.supplier_info?.trim() || null,
            notes: dto.notes?.trim() || null,
            status: 'draft',
            created_by: userId,
        })
            .select()
            .single();
        if (rError) {
            if (rError.code === '23505') {
                const err = new Error(`Receipt number '${receiptNumber}' already exists`);
                err.status = 409;
                throw err;
            }
            throw rError;
        }
        // 5. Insert items
        const itemsToInsert = dto.items.map((item) => ({
            receipt_id: receipt.id,
            product_id: item.product_id,
            location_id: item.location_id,
            quantity: item.quantity,
            unit_info: item.unit_info || null,
        }));
        const { error: itemsInsertError } = await this.db
            .from('receipt_items')
            .insert(itemsToInsert);
        if (itemsInsertError) {
            // Rollback receipt header if items fail
            await this.db.from('receipts').delete().eq('id', receipt.id);
            throw itemsInsertError;
        }
        return this.getReceiptById(orgId, receipt.id);
    }
    async updateReceipt(orgId, id, dto) {
        const existing = await this.getReceiptById(orgId, id);
        if (!existing) {
            const err = new Error('Receipt not found');
            err.status = 404;
            throw err;
        }
        if (existing.status !== 'draft') {
            const err = new Error('Completed or validated receipts cannot be modified');
            err.status = 400;
            throw err;
        }
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (dto.supplier_info !== undefined) {
            updatePayload.supplier_info = dto.supplier_info ? dto.supplier_info.trim() : null;
        }
        if (dto.notes !== undefined) {
            updatePayload.notes = dto.notes ? dto.notes.trim() : null;
        }
        const { error: rError } = await this.db
            .from('receipts')
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', orgId);
        if (rError)
            throw rError;
        // Replace items if provided
        if (dto.items) {
            if (dto.items.length === 0) {
                const err = new Error('Receipt must contain at least one line item');
                err.status = 400;
                throw err;
            }
            for (const item of dto.items) {
                if (item.quantity <= 0) {
                    const err = new Error('Item quantity must be greater than zero');
                    err.status = 400;
                    throw err;
                }
                const { data: loc } = await this.db
                    .from('locations')
                    .select('id')
                    .eq('id', item.location_id)
                    .eq('warehouse_id', existing.warehouse_id)
                    .eq('organization_id', orgId)
                    .maybeSingle();
                if (!loc) {
                    const err = new Error(`Location ${item.location_id} does not belong to receipt warehouse`);
                    err.status = 400;
                    throw err;
                }
            }
            await this.db.from('receipt_items').delete().eq('receipt_id', id);
            const itemsToInsert = dto.items.map((item) => ({
                receipt_id: id,
                product_id: item.product_id,
                location_id: item.location_id,
                quantity: item.quantity,
                unit_info: item.unit_info || null,
            }));
            await this.db.from('receipt_items').insert(itemsToInsert);
        }
        return this.getReceiptById(orgId, id);
    }
    async validateReceipt(orgId, id, userId) {
        // 1. Check if RPC function exists and attempt RPC execution
        try {
            const { data: rpcResult, error: rpcError } = await this.db.rpc('rpc_validate_receipt', {
                p_org_id: orgId,
                p_receipt_id: id,
                p_user_id: userId,
            });
            if (!rpcError && rpcResult?.success) {
                return this.getReceiptById(orgId, id);
            }
            if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
                // Business error from inside RPC
                const err = new Error(rpcError.message);
                err.status = rpcError.message.includes('ALREADY_COMPLETED') ? 400 : 400;
                throw err;
            }
        }
        catch (e) {
            if (e.status)
                throw e;
            // If RPC is unavailable (e.g. test environment), fall back to TypeScript atomic transaction engine
        }
        // 2. TypeScript Atomic Engine Fallback
        const receipt = await this.getReceiptById(orgId, id);
        if (!receipt) {
            const err = new Error('Receipt not found');
            err.status = 404;
            throw err;
        }
        if (receipt.status === 'completed' || receipt.status === 'validated') {
            const err = new Error(`Receipt ${receipt.receipt_number} has already been validated`);
            err.status = 400;
            throw err;
        }
        if (!receipt.items || receipt.items.length === 0) {
            const err = new Error('Cannot validate an empty receipt with no items');
            err.status = 400;
            throw err;
        }
        // Atomic pre-validation of all items
        for (const item of receipt.items) {
            if (Number(item.quantity) <= 0) {
                const err = new Error('Item quantity must be greater than zero');
                err.status = 400;
                throw err;
            }
        }
        // Execute mutations with rollback tracking
        const appliedStockChanges = [];
        const createdLedgerIds = [];
        try {
            for (const item of receipt.items) {
                const qty = Number(item.quantity);
                // Fetch current stock
                const { data: currentStock } = await this.db
                    .from('stock')
                    .select('id, quantity')
                    .eq('organization_id', orgId)
                    .eq('product_id', item.product_id)
                    .eq('location_id', item.location_id)
                    .maybeSingle();
                let oldQty = 0;
                let newQty = qty;
                if (currentStock) {
                    oldQty = Number(currentStock.quantity || 0);
                    newQty = oldQty + qty;
                    appliedStockChanges.push({ id: currentStock.id, originalQty: oldQty, isNew: false });
                    const { error: updErr } = await this.db
                        .from('stock')
                        .update({ quantity: newQty, updated_at: new Date().toISOString() })
                        .eq('id', currentStock.id);
                    if (updErr)
                        throw updErr;
                }
                else {
                    appliedStockChanges.push({ id: '', originalQty: 0, isNew: true });
                    const { data: newStockRow, error: insErr } = await this.db
                        .from('stock')
                        .insert({
                        organization_id: orgId,
                        product_id: item.product_id,
                        warehouse_id: receipt.warehouse_id,
                        location_id: item.location_id,
                        quantity: newQty,
                    })
                        .select()
                        .single();
                    if (insErr)
                        throw insErr;
                    appliedStockChanges[appliedStockChanges.length - 1].id = newStockRow.id;
                }
                // Create Stock Ledger Entry
                const { data: ledgerEntry, error: ledErr } = await this.db
                    .from('stock_ledger')
                    .insert({
                    organization_id: orgId,
                    product_id: item.product_id,
                    warehouse_id: receipt.warehouse_id,
                    location_id: item.location_id,
                    transaction_type: 'receipt',
                    reference_type: 'receipt',
                    reference_id: receipt.id,
                    quantity_change: qty,
                    previous_quantity: oldQty,
                    new_quantity: newQty,
                    reason: receipt.notes || `Receipt ${receipt.receipt_number}`,
                    performed_by: userId,
                })
                    .select()
                    .single();
                if (ledErr)
                    throw ledErr;
                createdLedgerIds.push(ledgerEntry.id);
            }
            // Mark receipt completed
            const { error: statusErr } = await this.db
                .from('receipts')
                .update({
                status: 'completed',
                validated_by: userId,
                validated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .eq('id', id)
                .eq('organization_id', orgId);
            if (statusErr)
                throw statusErr;
            return this.getReceiptById(orgId, id);
        }
        catch (atomicError) {
            // ROLLBACK ALL APPLIED CHANGES
            for (const change of appliedStockChanges) {
                if (change.isNew && change.id) {
                    await this.db.from('stock').delete().eq('id', change.id);
                }
                else if (!change.isNew && change.id) {
                    await this.db.from('stock').update({ quantity: change.originalQty }).eq('id', change.id);
                }
            }
            for (const ledgerId of createdLedgerIds) {
                await this.db.from('stock_ledger').delete().eq('id', ledgerId);
            }
            throw atomicError;
        }
    }
}
//# sourceMappingURL=receipt.service.js.map