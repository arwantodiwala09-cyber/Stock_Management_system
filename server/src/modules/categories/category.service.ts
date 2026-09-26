import type { SupabaseClient } from '@supabase/supabase-js';

export interface CategoryListParams {
  search?: string | undefined;
  status?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  all?: boolean | undefined;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string | undefined;
  status?: string | undefined;
}

export interface UpdateCategoryDTO {
  name?: string | undefined;
  description?: string | undefined;
  status?: string | undefined;
}


export class CategoryService {
  constructor(private db: SupabaseClient) {}

  async listCategories(orgId: string, params: CategoryListParams) {
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
      if (error) throw error;
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
    if (error) throw error;

    const total = count || 0;
    return {
      items: data || [],
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getCategoryById(orgId: string, id: string) {
    const { data, error } = await this.db
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createCategory(orgId: string, dto: CreateCategoryDTO) {
    const trimmedName = dto.name.trim();

    // Check unique name within organization
    const { data: existing } = await this.db
      .from('categories')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      const conflictError: any = new Error(`Category '${trimmedName}' already exists in this organization`);
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
        const conflictError: any = new Error(`Category '${trimmedName}' already exists in this organization`);
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }

    return data;
  }

  async updateCategory(orgId: string, id: string, dto: UpdateCategoryDTO) {
    // Verify existence in org
    const existingCategory = await this.getCategoryById(orgId, id);
    if (!existingCategory) {
      const notFoundError: any = new Error('Category not found');
      notFoundError.status = 404;
      throw notFoundError;
    }

    const updatePayload: Record<string, any> = {
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
          const conflictError: any = new Error(`Category '${trimmedName}' already exists in this organization`);
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
        const conflictError: any = new Error('Category name already exists in this organization');
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }

    return data;
  }
}
