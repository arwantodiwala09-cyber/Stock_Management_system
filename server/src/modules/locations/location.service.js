export class LocationService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listLocations(orgId, params) {
        let query = this.db
            .from('locations')
            .select('*, warehouses(id, name, code)', { count: 'exact' })
            .eq('organization_id', orgId)
            .order('name', { ascending: true });
        if (params.warehouseId) {
            query = query.eq('warehouse_id', params.warehouseId);
        }
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        if (params.search && params.search.trim()) {
            const s = params.search.trim();
            query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%`);
        }
        if (params.all) {
            const { data, error } = await query;
            if (error)
                throw error;
            return {
                items: data || [],
                total: data ? data.length : 0,
            };
        }
        const page = Math.max(1, params.page || 1);
        const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);
        const { data, count, error } = await query;
        if (error)
            throw error;
        const total = count || 0;
        return {
            items: data || [],
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async getLocationById(orgId, id) {
        const { data, error } = await this.db
            .from('locations')
            .select('*, warehouses(id, name, code)')
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async createLocation(orgId, dto) {
        const trimmedName = dto.name.trim();
        const normalizedCode = dto.code.trim().toUpperCase();
        // 1. Verify warehouse belongs to current organization
        const { data: warehouse, error: whError } = await this.db
            .from('warehouses')
            .select('id')
            .eq('id', dto.warehouse_id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (whError || !warehouse) {
            const badReq = new Error('Invalid warehouse: warehouse does not belong to the current organization');
            badReq.status = 400;
            throw badReq;
        }
        // 2. Check code uniqueness within (org, warehouse)
        const { data: existing } = await this.db
            .from('locations')
            .select('id')
            .eq('organization_id', orgId)
            .eq('warehouse_id', dto.warehouse_id)
            .eq('code', normalizedCode)
            .maybeSingle();
        if (existing) {
            const conflictError = new Error(`Location code '${normalizedCode}' already exists in this warehouse`);
            conflictError.status = 409;
            throw conflictError;
        }
        const { data, error } = await this.db
            .from('locations')
            .insert({
            organization_id: orgId,
            warehouse_id: dto.warehouse_id,
            name: trimmedName,
            code: normalizedCode,
            type: dto.type || 'storage',
            status: dto.status || 'active',
        })
            .select('*, warehouses(id, name, code)')
            .single();
        if (error) {
            if (error.code === '23505') {
                const conflictError = new Error(`Location code '${normalizedCode}' already exists in this warehouse`);
                conflictError.status = 409;
                throw conflictError;
            }
            throw error;
        }
        return data;
    }
    async updateLocation(orgId, id, dto) {
        const existing = await this.getLocationById(orgId, id);
        if (!existing) {
            const notFoundError = new Error('Location not found');
            notFoundError.status = 404;
            throw notFoundError;
        }
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (dto.name !== undefined) {
            updatePayload.name = dto.name.trim();
        }
        if (dto.code !== undefined) {
            const normalizedCode = dto.code.trim().toUpperCase();
            if (normalizedCode !== existing.code) {
                const { data: duplicate } = await this.db
                    .from('locations')
                    .select('id')
                    .eq('organization_id', orgId)
                    .eq('warehouse_id', existing.warehouse_id)
                    .eq('code', normalizedCode)
                    .neq('id', id)
                    .maybeSingle();
                if (duplicate) {
                    const conflictError = new Error(`Location code '${normalizedCode}' already exists in this warehouse`);
                    conflictError.status = 409;
                    throw conflictError;
                }
            }
            updatePayload.code = normalizedCode;
        }
        if (dto.type !== undefined) {
            updatePayload.type = dto.type;
        }
        if (dto.status !== undefined) {
            updatePayload.status = dto.status;
        }
        const { data, error } = await this.db
            .from('locations')
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select('*, warehouses(id, name, code)')
            .single();
        if (error) {
            if (error.code === '23505') {
                const conflictError = new Error('Location code already exists in this warehouse');
                conflictError.status = 409;
                throw conflictError;
            }
            throw error;
        }
        return data;
    }
}
//# sourceMappingURL=location.service.js.map