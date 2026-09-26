import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProductListParams {
  search?: string | undefined;
  categoryId?: string | undefined;
  status?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  all?: boolean | undefined;
}

export interface CreateProductDTO {
  sku: string;
  name: string;
  description?: string | null | undefined;
  category_id?: string | null | undefined;
  unit_of_measure?: string | undefined;
  reorder_level?: number | undefined;
  status?: string | undefined;
  image_path?: string | null | undefined;
}

export interface UpdateProductDTO {
  sku?: string | undefined;
  name?: string | undefined;
  description?: string | null | undefined;
  category_id?: string | null | undefined;
  unit_of_measure?: string | undefined;
  reorder_level?: number | undefined;
  status?: string | undefined;
  image_path?: string | null | undefined;
}


export class ProductService {
  constructor(private db: SupabaseClient) {}

  async listProducts(orgId: string, params: ProductListParams) {
    let query = this.db
      .from('products')
      .select('id, sku, name, unit_of_measure, reorder_level, status, image_path, created_at, categories(id, name)', { count: 'exact' })
      .eq('organization_id', orgId);

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.categoryId && params.categoryId !== 'all') {
      query = query.eq('category_id', params.categoryId);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`name.ilike.%${s}%,sku.ilike.%${s}%`);
    }

    const sortColumn = ['name', 'sku', 'reorder_level', 'created_at'].includes(params.sortBy || '')
      ? (params.sortBy as string)
      : 'created_at';
    const ascending = params.sortOrder === 'asc';

    query = query.order(sortColumn, { ascending });

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

  async getProductById(orgId: string, id: string) {
    const { data: product, error: prodError } = await this.db
      .from('products')
      .select('*, categories(id, name)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (prodError) throw prodError;
    if (!product) return null;

    // Fetch stock distribution across warehouses and locations
    const { data: stockRecords, error: stockError } = await this.db
      .from('stock')
      .select(`
        id,
        quantity,
        warehouses (id, name, code),
        locations (id, name, code, type)
      `)
      .eq('product_id', id)
      .eq('organization_id', orgId);

    if (stockError) throw stockError;

    const stockItems = (stockRecords || []).map((s: any) => ({
      id: s.id,
      quantity: Number(s.quantity || 0),
      warehouse: s.warehouses,
      location: s.locations,
    }));

    const totalStock = stockItems.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
    const reorderLevel = Number(product.reorder_level || 0);

    let stockStatus: 'Out of Stock' | 'Low Stock' | 'Healthy' = 'Healthy';
    if (totalStock === 0) {
      stockStatus = 'Out of Stock';
    } else if (totalStock <= reorderLevel) {
      stockStatus = 'Low Stock';
    }

    return {
      ...product,
      stock_summary: {
        total_quantity: totalStock,
        reorder_level: reorderLevel,
        status: stockStatus,
      },
      stock_distribution: stockItems,
    };
  }

  async createProduct(orgId: string, dto: CreateProductDTO) {
    const normalizedSku = dto.sku.trim().toUpperCase();
    const trimmedName = dto.name.trim();

    // 1. Verify SKU uniqueness in organization
    const { data: existingSku } = await this.db
      .from('products')
      .select('id')
      .eq('organization_id', orgId)
      .eq('sku', normalizedSku)
      .maybeSingle();

    if (existingSku) {
      const conflictError: any = new Error(`Product with SKU '${normalizedSku}' already exists in this organization`);
      conflictError.status = 409;
      throw conflictError;
    }

    // 2. If category_id is provided, verify it belongs to current organization
    if (dto.category_id) {
      const { data: category } = await this.db
        .from('categories')
        .select('id')
        .eq('id', dto.category_id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!category) {
        const badReq: any = new Error('Category not found or does not belong to the current organization');
        badReq.status = 400;
        throw badReq;
      }
    }

    const reorderLevel = typeof dto.reorder_level === 'number' && dto.reorder_level >= 0
      ? dto.reorder_level
      : 0;

    const { data, error } = await this.db
      .from('products')
      .insert({
        organization_id: orgId,
        sku: normalizedSku,
        name: trimmedName,
        description: dto.description?.trim() || null,
        category_id: dto.category_id || null,
        unit_of_measure: dto.unit_of_measure?.trim() || 'pcs',
        reorder_level: reorderLevel,
        status: dto.status || 'active',
        image_path: dto.image_path?.trim() || null,
      })
      .select('*, categories(id, name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        const conflictError: any = new Error(`Product with SKU '${normalizedSku}' already exists`);
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }

    return data;
  }

  async updateProduct(orgId: string, id: string, dto: UpdateProductDTO) {
    const existing = await this.db
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (!existing.data) {
      const notFoundError: any = new Error('Product not found');
      notFoundError.status = 404;
      throw notFoundError;
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.sku !== undefined) {
      const normalizedSku = dto.sku.trim().toUpperCase();
      if (normalizedSku !== existing.data.sku) {
        const { data: duplicate } = await this.db
          .from('products')
          .select('id')
          .eq('organization_id', orgId)
          .eq('sku', normalizedSku)
          .neq('id', id)
          .maybeSingle();

        if (duplicate) {
          const conflictError: any = new Error(`Product with SKU '${normalizedSku}' already exists in this organization`);
          conflictError.status = 409;
          throw conflictError;
        }
      }
      updatePayload.sku = normalizedSku;
    }

    if (dto.name !== undefined) {
      updatePayload.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      updatePayload.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.category_id !== undefined) {
      if (dto.category_id) {
        const { data: category } = await this.db
          .from('categories')
          .select('id')
          .eq('id', dto.category_id)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (!category) {
          const badReq: any = new Error('Category not found or does not belong to the current organization');
          badReq.status = 400;
          throw badReq;
        }
        updatePayload.category_id = dto.category_id;
      } else {
        updatePayload.category_id = null;
      }
    }

    if (dto.unit_of_measure !== undefined) {
      updatePayload.unit_of_measure = dto.unit_of_measure.trim();
    }

    if (dto.reorder_level !== undefined) {
      if (dto.reorder_level < 0) {
        const badReq: any = new Error('Reorder level must be greater than or equal to 0');
        badReq.status = 400;
        throw badReq;
      }
      updatePayload.reorder_level = dto.reorder_level;
    }

    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }

    if (dto.image_path !== undefined) {
      updatePayload.image_path = dto.image_path ? dto.image_path.trim() : null;
    }

    const { data, error } = await this.db
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('*, categories(id, name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        const conflictError: any = new Error('Product SKU already exists');
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }

    return data;
  }
}
