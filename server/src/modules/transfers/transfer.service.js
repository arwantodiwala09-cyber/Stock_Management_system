import { generateDocumentNumber } from '../../utils/numbering.js';
export class TransferService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listTransfers(orgId, params) {
        let query = this.db
            .from('transfers')
            .select(`
        *,
        source_warehouse:source_warehouse_id(id, name, code),
        destination_warehouse:destination_warehouse_id(id, name, code),
        transfer_items(id, quantity)
      `, { count: 'exact' })
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        if (params.sourceWarehouseId && params.sourceWarehouseId !== 'all') {
            query = query.eq('source_warehouse_id', params.sourceWarehouseId);
        }
        if (params.destinationWarehouseId && params.destinationWarehouseId !== 'all') {
            query = query.eq('destination_warehouse_id', params.destinationWarehouseId);
        }
        if (params.search && params.search.trim()) {
            query = query.ilike('transfer_number', `%${params.search.trim()}%`);
        }
        const page = Math.max(1, params.page || 1);
        const pageSize = Math.min(100, Math.max(1, params.pageSize || 15));
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);
        const { data, count, error } = await query;
        if (error)
            throw error;
        const items = (data || []).map((t) => {
            const itemCount = (t.transfer_items || []).length;
            const totalQuantity = (t.transfer_items || []).reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
            return {
                ...t,
                item_count: itemCount,
                total_quantity: totalQuantity,
                transfer_items: undefined,
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
    async getTransferById(orgId, id) {
        const { data: transfer, error } = await this.db
            .from('transfers')
            .select(`
        *,
        source_warehouse:source_warehouse_id(id, name, code),
        destination_warehouse:destination_warehouse_id(id, name, code)
      `)
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (error)
            throw error;
        if (!transfer)
            return null;
        const { data: items, error: itemsError } = await this.db
            .from('transfer_items')
            .select(`
        *,
        products(id, name, sku, unit_of_measure),
        source_location:source_location_id(id, name, code),
        destination_location:destination_location_id(id, name, code)
      `)
            .eq('transfer_id', id);
        if (itemsError)
            throw itemsError;
        return {
            ...transfer,
            items: items || [],
        };
    }
    async createTransfer(orgId, userId, dto) {
        // 1. Verify warehouses belong to org
        const { data: srcWh } = await this.db
            .from('warehouses')
            .select('id')
            .eq('id', dto.source_warehouse_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        const { data: dstWh } = await this.db
            .from('warehouses')
            .select('id')
            .eq('id', dto.destination_warehouse_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (!srcWh || !dstWh) {
            const err = new Error('One or both warehouses do not belong to the current organization');
            err.status = 400;
            throw err;
        }
        if (!dto.items || dto.items.length === 0) {
            const err = new Error('Transfer must contain at least one line item');
            err.status = 400;
            throw err;
        }
        // 2. Validate items
        for (const item of dto.items) {
            if (item.quantity <= 0) {
                const err = new Error('Item quantity must be greater than zero');
                err.status = 400;
                throw err;
            }
            if (item.source_location_id === item.destination_location_id) {
                const err = new Error('Source and destination locations cannot be identical');
                err.status = 400;
                throw err;
            }
            const { data: product } = await this.db
                .from('products')
                .select('id')
                .eq('id', item.product_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!product) {
                const err = new Error(`Product ${item.product_id} not found in this organization`);
                err.status = 400;
                throw err;
            }
            const { data: srcLoc } = await this.db
                .from('locations')
                .select('id')
                .eq('id', item.source_location_id)
                .eq('warehouse_id', dto.source_warehouse_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!srcLoc) {
                const err = new Error(`Source location ${item.source_location_id} does not belong to source warehouse`);
                err.status = 400;
                throw err;
            }
            const { data: dstLoc } = await this.db
                .from('locations')
                .select('id')
                .eq('id', item.destination_location_id)
                .eq('warehouse_id', dto.destination_warehouse_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!dstLoc) {
                const err = new Error(`Destination location ${item.destination_location_id} does not belong to destination warehouse`);
                err.status = 400;
                throw err;
            }
        }
        // 3. Document number
        const transferNumber = dto.transfer_number?.trim() ||
            await generateDocumentNumber(this.db, 'transfers', 'transfer_number', orgId, 'TRF');
        // 4. Insert header
        const { data: transfer, error: tError } = await this.db
            .from('transfers')
            .insert({
            organization_id: orgId,
            transfer_number: transferNumber,
            source_warehouse_id: dto.source_warehouse_id,
            destination_warehouse_id: dto.destination_warehouse_id,
            notes: dto.notes?.trim() || null,
            status: 'draft',
            created_by: userId,
        })
            .select()
            .single();
        if (tError) {
            if (tError.code === '23505') {
                const err = new Error(`Transfer number '${transferNumber}' already exists`);
                err.status = 409;
                throw err;
            }
            throw tError;
        }
        // 5. Insert items
        const itemsToInsert = dto.items.map((item) => ({
            transfer_id: transfer.id,
            product_id: item.product_id,
            source_location_id: item.source_location_id,
            destination_location_id: item.destination_location_id,
            quantity: item.quantity,
        }));
        const { error: itemsError } = await this.db
            .from('transfer_items')
            .insert(itemsToInsert);
        if (itemsError) {
            await this.db.from('transfers').delete().eq('id', transfer.id);
            throw itemsError;
        }
        return this.getTransferById(orgId, transfer.id);
    }
    async updateTransfer(orgId, id, dto) {
        const existing = await this.getTransferById(orgId, id);
        if (!existing) {
            const err = new Error('Transfer not found');
            err.status = 404;
            throw err;
        }
        if (existing.status !== 'draft') {
            const err = new Error('Completed transfers cannot be modified');
            err.status = 400;
            throw err;
        }
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (dto.notes !== undefined) {
            updatePayload.notes = dto.notes ? dto.notes.trim() : null;
        }
        const { error: tError } = await this.db
            .from('transfers')
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', orgId);
        if (tError)
            throw tError;
        if (dto.items) {
            if (dto.items.length === 0) {
                const err = new Error('Transfer must contain at least one line item');
                err.status = 400;
                throw err;
            }
            for (const item of dto.items) {
                if (item.source_location_id === item.destination_location_id) {
                    const err = new Error('Source and destination locations cannot be identical');
                    err.status = 400;
                    throw err;
                }
                const { data: srcLoc } = await this.db
                    .from('locations')
                    .select('id')
                    .eq('id', item.source_location_id)
                    .eq('warehouse_id', existing.source_warehouse_id)
                    .eq('organization_id', orgId)
                    .maybeSingle();
                const { data: dstLoc } = await this.db
                    .from('locations')
                    .select('id')
                    .eq('id', item.destination_location_id)
                    .eq('warehouse_id', existing.destination_warehouse_id)
                    .eq('organization_id', orgId)
                    .maybeSingle();
                if (!srcLoc || !dstLoc) {
                    const err = new Error('Locations do not match respective source/destination warehouses');
                    err.status = 400;
                    throw err;
                }
            }
            await this.db.from('transfer_items').delete().eq('transfer_id', id);
            const itemsToInsert = dto.items.map((item) => ({
                transfer_id: id,
                product_id: item.product_id,
                source_location_id: item.source_location_id,
                destination_location_id: item.destination_location_id,
                quantity: item.quantity,
            }));
            await this.db.from('transfer_items').insert(itemsToInsert);
        }
        return this.getTransferById(orgId, id);
    }
    async completeTransfer(orgId, id, userId) {
        // 1. Try RPC
        try {
            const { data: rpcResult, error: rpcError } = await this.db.rpc('rpc_complete_transfer', {
                p_org_id: orgId,
                p_transfer_id: id,
                p_user_id: userId,
            });
            if (!rpcError && rpcResult?.success) {
                return this.getTransferById(orgId, id);
            }
            if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
                const err = new Error(rpcError.message);
                err.status = 400;
                throw err;
            }
        }
        catch (e) {
            if (e.status)
                throw e;
        }
        // 2. TypeScript Atomic Fallback
        const transfer = await this.getTransferById(orgId, id);
        if (!transfer) {
            const err = new Error('Transfer not found');
            err.status = 404;
            throw err;
        }
        if (transfer.status === 'completed') {
            const err = new Error(`Transfer ${transfer.transfer_number} has already been completed`);
            err.status = 400;
            throw err;
        }
        if (!transfer.items || transfer.items.length === 0) {
            const err = new Error('Cannot complete an empty transfer with no items');
            err.status = 400;
            throw err;
        }
        // Step A: Stock pre-check for ALL items
        const preCheckPlans = [];
        for (const item of transfer.items) {
            const qty = Number(item.quantity);
            if (qty <= 0) {
                const err = new Error('Item quantity must be greater than zero');
                err.status = 400;
                throw err;
            }
            if (item.source_location_id === item.destination_location_id) {
                const err = new Error('Source and destination locations cannot be identical');
                err.status = 400;
                throw err;
            }
            // Check source stock
            const { data: srcStock } = await this.db
                .from('stock')
                .select('id, quantity')
                .eq('organization_id', orgId)
                .eq('product_id', item.product_id)
                .eq('location_id', item.source_location_id)
                .maybeSingle();
            const availableSrcQty = Number(srcStock?.quantity || 0);
            if (!srcStock || availableSrcQty < qty) {
                const productName = item.products?.name || item.product_id;
                const err = new Error(`INSUFFICIENT_STOCK: Insufficient stock for product "${productName}" at source location. Available: ${availableSrcQty}, Requested: ${qty}`);
                err.status = 400;
                throw err;
            }
            // Check destination stock
            const { data: dstStock } = await this.db
                .from('stock')
                .select('id, quantity')
                .eq('organization_id', orgId)
                .eq('product_id', item.product_id)
                .eq('location_id', item.destination_location_id)
                .maybeSingle();
            const dstOldQty = Number(dstStock?.quantity || 0);
            preCheckPlans.push({
                item,
                srcStockId: srcStock.id,
                srcOldQty: availableSrcQty,
                srcNewQty: availableSrcQty - qty,
                dstStockId: dstStock?.id,
                dstOldQty,
                dstNewQty: dstOldQty + qty,
            });
        }
        // Step B: Atomically mutate source and destination stock with ledger
        const appliedStockChanges = [];
        const createdLedgerIds = [];
        try {
            for (const plan of preCheckPlans) {
                const qty = Number(plan.item.quantity);
                // Deduct source
                appliedStockChanges.push({ id: plan.srcStockId, originalQty: plan.srcOldQty, isNew: false });
                const { error: srcErr } = await this.db
                    .from('stock')
                    .update({ quantity: plan.srcNewQty, updated_at: new Date().toISOString() })
                    .eq('id', plan.srcStockId);
                if (srcErr)
                    throw srcErr;
                // Add destination
                if (plan.dstStockId) {
                    appliedStockChanges.push({ id: plan.dstStockId, originalQty: plan.dstOldQty, isNew: false });
                    const { error: dstErr } = await this.db
                        .from('stock')
                        .update({ quantity: plan.dstNewQty, updated_at: new Date().toISOString() })
                        .eq('id', plan.dstStockId);
                    if (dstErr)
                        throw dstErr;
                }
                else {
                    appliedStockChanges.push({ id: '', originalQty: 0, isNew: true });
                    const { data: newDstRow, error: insErr } = await this.db
                        .from('stock')
                        .insert({
                        organization_id: orgId,
                        product_id: plan.item.product_id,
                        warehouse_id: transfer.destination_warehouse_id,
                        location_id: plan.item.destination_location_id,
                        quantity: plan.dstNewQty,
                    })
                        .select()
                        .single();
                    if (insErr)
                        throw insErr;
                    appliedStockChanges[appliedStockChanges.length - 1].id = newDstRow.id;
                }
                // Source Ledger
                const { data: led1, error: led1Err } = await this.db
                    .from('stock_ledger')
                    .insert({
                    organization_id: orgId,
                    product_id: plan.item.product_id,
                    warehouse_id: transfer.source_warehouse_id,
                    location_id: plan.item.source_location_id,
                    transaction_type: 'transfer',
                    reference_type: 'transfer',
                    reference_id: transfer.id,
                    quantity_change: -qty,
                    previous_quantity: plan.srcOldQty,
                    new_quantity: plan.srcNewQty,
                    reason: `Transfer out ${transfer.transfer_number}`,
                    performed_by: userId,
                })
                    .select()
                    .single();
                if (led1Err)
                    throw led1Err;
                createdLedgerIds.push(led1.id);
                // Destination Ledger
                const { data: led2, error: led2Err } = await this.db
                    .from('stock_ledger')
                    .insert({
                    organization_id: orgId,
                    product_id: plan.item.product_id,
                    warehouse_id: transfer.destination_warehouse_id,
                    location_id: plan.item.destination_location_id,
                    transaction_type: 'transfer',
                    reference_type: 'transfer',
                    reference_id: transfer.id,
                    quantity_change: qty,
                    previous_quantity: plan.dstOldQty,
                    new_quantity: plan.dstNewQty,
                    reason: `Transfer in ${transfer.transfer_number}`,
                    performed_by: userId,
                })
                    .select()
                    .single();
                if (led2Err)
                    throw led2Err;
                createdLedgerIds.push(led2.id);
            }
            // Mark completed
            const { error: statusErr } = await this.db
                .from('transfers')
                .update({
                status: 'completed',
                completed_by: userId,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .eq('id', id)
                .eq('organization_id', orgId);
            if (statusErr)
                throw statusErr;
            return this.getTransferById(orgId, id);
        }
        catch (atomicError) {
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
//# sourceMappingURL=transfer.service.js.map