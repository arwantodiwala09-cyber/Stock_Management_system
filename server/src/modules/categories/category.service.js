export class CategoryService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listCategories(orgId, params) {
        let query = this.db
            .from('categories')
            .select('*', { count: 'exact' })
            .eq('organization_id', orgId)
            .order('name', { ascending: true });
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        if (params.search && params.search.trim()) {
            query = query.ilike('name', `%${params.search.trim()}%`);
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
    async getCategoryById(orgId, id) {
        const { data, error } = await this.db
            .from('categories')
            .select('*')
            .eq('id', id)
            .eq('organization_id', orgId)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async createCategory(orgId, dto) {
        const trimmedName = dto.name.trim();
        // Check unique name within organization
        const { data: existing } = await this.db
            .from('categories')
            .select('id')
            .eq('organization_id', orgId)
            .ilike('name', trimmedName)
            .maybeSingle();
        if (existing) {
            const conflictError = new Error(`Category '${trimmedName}' already exists in this organization`);
            conflictError.status = 409;
            throw conflictError;
        }
        const { data, error } = await this.db
            .from('categories')
            .insert({
            organization_id: orgId,
            name: trimmedName,
            description: dto.description?.trim() || null,
            status: dto.status || 'active',
        })
            .select()
            .single();
        if (error) {
            if (error.code === '23505') {
                const conflictError = new Error(`Category '${trimmedName}' already exists in this organization`);
                conflictError.status = 409;
                throw conflictError;
            }
            throw error;
        }
        return data;
    }
    async updateCategory(orgId, id, dto) {
        // Verify existence in org
        const existingCategory = await this.getCategoryById(orgId, id);
        if (!existingCategory) {
            const notFoundError = new Error('Category not found');
            notFoundError.status = 404;
            throw notFoundError;
        }
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (dto.name !== undefined) {
            const trimmedName = dto.name.trim();
            if (trimmedName.toLowerCase() !== existingCategory.name.toLowerCase()) {
                const { data: duplicate } = await this.db
                    .from('categories')
                    .select('id')
                    .eq('organization_id', orgId)
                    .ilike('name', trimmedName)
                    .neq('id', id)
                    .maybeSingle();
                if (duplicate) {
                    const conflictError = new Error(`Category '${trimmedName}' already exists in this organization`);
                    conflictError.status = 409;
                    throw conflictError;
                }
            }
            updatePayload.name = trimmedName;
        }
        if (dto.description !== undefined) {
            updatePayload.description = dto.description ? dto.description.trim() : null;
        }
        if (dto.status !== undefined) {
            updatePayload.status = dto.status;
        }
        const { data, error } = await this.db
            .from('categories')
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();
        if (error) {
            if (error.code === '23505') {
                const conflictError = new Error('Category name already exists in this organization');
                conflictError.status = 409;
                throw conflictError;
            }
            throw error;
        }
        return data;
    }
}
//# sourceMappingURL=category.service.js.map