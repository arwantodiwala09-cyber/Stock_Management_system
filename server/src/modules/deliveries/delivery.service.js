import { generateDocumentNumber } from '../../utils/numbering.js';
export class DeliveryService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listDeliveries(orgId, params) {
        let query = this.db
            .from('deliveries')
            .select('*, warehouses(id, name, code), delivery_items(id, quantity)', { count: 'exact' })
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
            query = query.or(`delivery_number.ilike.%${s}%,customer_info.ilike.%${s}%`);
        }
        const page = Math.max(1, params.page || 1);
        const pageSize = Math.min(100, Math.max(1, params.pageSize || 15));
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);
        const { data, count, error } = await query;
        if (error)
            throw error;
        const items = (data || []).map((d) => {
            const itemCount = (d.delivery_items || []).length;
            const totalQuantity = (d.delivery_items || []).reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
            return {
                ...d,
                item_count: itemCount,
                total_quantity: totalQuantity,
                delivery_items: undefined,
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
    async getDeliveryById(orgId, id) {
        const { data: delivery, error } = await this.db
            .from('deliveries')
            .select('*, warehouses(id, name, code)')
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (error)
            throw error;
        if (!delivery)
            return null;
        const { data: items, error: itemsError } = await this.db
            .from('delivery_items')
            .select('*, products(id, name, sku, unit_of_measure), locations(id, name, code, type)')
            .eq('delivery_id', id);
        if (itemsError)
            throw itemsError;
        return {
            ...delivery,
            items: items || [],
        };
    }
    async createDelivery(orgId, userId, dto) {
        // 1. Verify warehouse belongs to current org
        const { data: warehouse } = await this.db
            .from('warehouses')
            .select('id')
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
            const err = new Error('Delivery must contain at least one line item');
            err.status = 400;
            throw err;
        }
        for (const item of dto.items) {
            if (item.quantity <= 0) {
                const err = new Error('Item quantity must be greater than zero');
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
                const err = new Error(`Product ${item.product_id} does not belong to the current organization`);
                err.status = 400;
                throw err;
            }
            const { data: location } = await this.db
                .from('locations')
                .select('id')
                .eq('id', item.location_id)
                .eq('warehouse_id', dto.warehouse_id)
                .eq('organization_id', orgId)
                .maybeSingle();
            if (!location) {
                const err = new Error(`Location ${item.location_id} does not belong to the selected warehouse`);
                err.status = 400;
                throw err;
            }
        }
        // 3. Document number
        const deliveryNumber = dto.delivery_number?.trim() ||
            await generateDocumentNumber(this.db, 'deliveries', 'delivery_number', orgId, 'DEL');
        // 4. Insert delivery header
        const { data: delivery, error: dError } = await this.db
            .from('deliveries')
            .insert({
            organization_id: orgId,
            delivery_number: deliveryNumber,
            warehouse_id: dto.warehouse_id,
            customer_info: dto.customer_info?.trim() || null,
            notes: dto.notes?.trim() || null,
            status: 'draft',
            created_by: userId,
        })
            .select()
            .single();
        if (dError) {
            if (dError.code === '23505') {
                const err = new Error(`Delivery number '${deliveryNumber}' already exists`);
                err.status = 409;
                throw err;
            }
            throw dError;
        }
        // 5. Insert delivery items
        const itemsToInsert = dto.items.map((item) => ({
            delivery_id: delivery.id,
            product_id: item.product_id,
            location_id: item.location_id,
            quantity: item.quantity,
        }));
        const { error: itemsError } = await this.db
            .from('delivery_items')
            .insert(itemsToInsert);
        if (itemsError) {
            await this.db.from('deliveries').delete().eq('id', delivery.id);
            throw itemsError;
        }
        return this.getDeliveryById(orgId, delivery.id);
    }
    async updateDelivery(orgId, id, dto) {
        const existing = await this.getDeliveryById(orgId, id);
        if (!existing) {
            const err = new Error('Delivery not found');
            err.status = 404;
            throw err;
        }
        if (existing.status !== 'draft') {
            const err = new Error('Completed or validated deliveries cannot be modified');
            err.status = 400;
            throw err;
        }
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (dto.customer_info !== undefined) {
            updatePayload.customer_info = dto.customer_info ? dto.customer_info.trim() : null;
        }
        if (dto.notes !== undefined) {
            updatePayload.notes = dto.notes ? dto.notes.trim() : null;
        }
        const { error: dError } = await this.db
            .from('deliveries')
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', orgId);
        if (dError)
            throw dError;
        if (dto.items) {
            if (dto.items.length === 0) {
                const err = new Error('Delivery must contain at least one line item');
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
                    const err = new Error(`Location ${item.location_id} does not belong to delivery warehouse`);
                    err.status = 400;
                    throw err;
                }
            }
            await this.db.from('delivery_items').delete().eq('delivery_id', id);
            const itemsToInsert = dto.items.map((item) => ({
                delivery_id: id,
                product_id: item.product_id,
                location_id: item.location_id,
                quantity: item.quantity,
            }));
            await this.db.from('delivery_items').insert(itemsToInsert);
        }
        return this.getDeliveryById(orgId, id);
    }
    async validateDelivery(orgId, id, userId) {
        // 1. Check if RPC function exists and attempt RPC execution
        try {
            const { data: rpcResult, error: rpcError } = await this.db.rpc('rpc_validate_delivery', {
                p_org_id: orgId,
                p_delivery_id: id,
                p_user_id: userId,
            });
            if (!rpcError && rpcResult?.success) {
                return this.getDeliveryById(orgId, id);
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
        // 2. TypeScript Atomic Engine Fallback
        const delivery = await this.getDeliveryById(orgId, id);
        if (!delivery) {
            const err = new Error('Delivery not found');
            err.status = 404;
            throw err;
        }
        if (delivery.status === 'completed' || delivery.status === 'validated') {
            const err = new Error(`Delivery ${delivery.delivery_number} has already been validated`);
            err.status = 400;
            throw err;
        }
        if (!delivery.items || delivery.items.length === 0) {
            const err = new Error('Cannot validate an empty delivery with no items');
            err.status = 400;
            throw err;
        }
        // Step A: Stock pre-check for ALL items before making any modifications
        const preCheckPlans = [];
        for (const item of delivery.items) {
            const qty = Number(item.quantity);
            if (qty <= 0) {
                const err = new Error('Item quantity must be greater than zero');
                err.status = 400;
                throw err;
            }
            const { data: stockRow } = await this.db
                .from('stock')
                .select('id, quantity')
                .eq('organization_id', orgId)
                .eq('product_id', item.product_id)
                .eq('location_id', item.location_id)
                .maybeSingle();
            const availableQty = Number(stockRow?.quantity || 0);
            if (!stockRow || availableQty < qty) {
                const productName = item.products?.name || item.product_id;
                const locationName = item.locations?.name || item.location_id;
                const err = new Error(`INSUFFICIENT_STOCK: Insufficient stock for product "${productName}" at location "${locationName}". Available: ${availableQty}, Requested: ${qty}`);
                err.status = 400;
                throw err;
            }
            preCheckPlans.push({
                item,
                stockId: stockRow.id,
                oldQty: availableQty,
                newQty: availableQty - qty,
            });
        }
        // Step B: Atomically apply stock updates and ledger entries
        const appliedStockChanges = [];
        const createdLedgerIds = [];
        try {
            for (const plan of preCheckPlans) {
                const qty = Number(plan.item.quantity);
                appliedStockChanges.push({ id: plan.stockId, originalQty: plan.oldQty });
                const { error: stockErr } = await this.db
                    .from('stock')
                    .update({ quantity: plan.newQty, updated_at: new Date().toISOString() })
                    .eq('id', plan.stockId);
                if (stockErr)
                    throw stockErr;
                const { data: ledgerEntry, error: ledErr } = await this.db
                    .from('stock_ledger')
                    .insert({
                    organization_id: orgId,
                    product_id: plan.item.product_id,
                    warehouse_id: delivery.warehouse_id,
                    location_id: plan.item.location_id,
                    transaction_type: 'delivery',
                    reference_type: 'delivery',
                    reference_id: delivery.id,
                    quantity_change: -qty,
                    previous_quantity: plan.oldQty,
                    new_quantity: plan.newQty,
                    reason: delivery.notes || `Delivery ${delivery.delivery_number}`,
                    performed_by: userId,
                })
                    .select()
                    .single();
                if (ledErr)
                    throw ledErr;
                createdLedgerIds.push(ledgerEntry.id);
            }
            // Mark delivery completed
            const { error: statusErr } = await this.db
                .from('deliveries')
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
            return this.getDeliveryById(orgId, id);
        }
        catch (atomicError) {
            // Rollback
            for (const change of appliedStockChanges) {
                await this.db.from('stock').update({ quantity: change.originalQty }).eq('id', change.id);
            }
            for (const ledgerId of createdLedgerIds) {
                await this.db.from('stock_ledger').delete().eq('id', ledgerId);
            }
            throw atomicError;
        }
    }
}
//# sourceMappingURL=delivery.service.js.map