import type { SupabaseClient } from '@supabase/supabase-js';

export interface WarehouseListParams {
  search?: string | undefined;
  status?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  all?: boolean | undefined;
}

export interface CreateWarehouseDTO {
  name: string;
  code: string;
  address?: string | undefined;
  status?: string | undefined;
}

export interface UpdateWarehouseDTO {
  name?: string | undefined;
  code?: string | undefined;
  address?: string | undefined;
  status?: string | undefined;
}


export class WarehouseService {
  constructor(private db: SupabaseClient) {}

  async listWarehouses(orgId: string, params: WarehouseListParams) {
    let query = this.db
      .from('warehouses')
      .select('*, locations(count)', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%`);
    }

    if (params.all) {
      const { data, error } = await query;
      if (error) throw error;
      const formatted = (data || []).map((w: any) => ({
        ...w,
        location_count: w.locations?.[0]?.count ?? 0,
        locations: undefined,
      }));
      return {
        items: formatted,
        total: formatted.length,
      };
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const offset = (page - 1) * pageSize;

    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const total = count || 0;
    const formatted = (data || []).map((w: any) => ({
      ...w,
      location_count: w.locations?.[0]?.count ?? 0,
      locations: undefined,
    }));

    return {
      items: formatted,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getWarehouseById(orgId: string, id: string) {
    const { data: warehouse, error: whError } = await this.db
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (whError) throw whError;
    if (!warehouse) return null;

    // Fetch locations for this warehouse
    const { data: locations, error: locError } = await this.db
      .from('locations')
      .select('*')
      .eq('warehouse_id', id)
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (locError) throw locError;

    // Fetch current stock summary for this warehouse
    const { data: stockItems, error: stockError } = await this.db
      .from('stock')
      .select('quantity, product_id')
      .eq('warehouse_id', id)
      .eq('organization_id', orgId);

    if (stockError) throw stockError;

    const totalQuantity = (stockItems || []).reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
    const uniqueProductsCount = new Set((stockItems || []).map((item: any) => item.product_id)).size;

    return {
      ...warehouse,
      locations: locations || [],
      stock_summary: {
        total_quantity: totalQuantity,
        total_products: uniqueProductsCount,
      },
    };
  }

  async createWarehouse(orgId: string, dto: CreateWarehouseDTO) {
    const trimmedName = dto.name.trim();
    const normalizedCode = dto.code.trim().toUpperCase();

    // Check code uniqueness in organization
    const { data: existing } = await this.db
      .from('warehouses')
      .select('id')
      .eq('organization_id', orgId)
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existing) {
      const conflictError: any = new Error(`Warehouse with code '${normalizedCode}' already exists in this organization`);
      conflictError.status = 409;
      throw conflictError;
    }

    const { data, error } = await this.db
      .from('warehouses')
      .insert({
        organization_id: orgId,
        name: trimmedName,
        code: normalizedCode,
        address: dto.address?.trim() || null,
        status: dto.status || 'active',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const conflictError: any = new Error(`Warehouse code '${normalizedCode}' already exists`);
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }

    return data;
  }

  async updateWarehouse(orgId: string, id: string, dto: UpdateWarehouseDTO) {
    const existing = await this.db
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (!existing.data) {
      const notFoundError: any = new Error('Warehouse not found');
      notFoundError.status = 404;
      throw notFoundError;
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) {
      updatePayload.name = dto.name.trim();
    }

    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== existing.data.code) {
        const { data: duplicate } = await this.db
          .from('warehouses')
          .select('id')
          .eq('organization_id', orgId)
          .eq('code', normalizedCode)
          .neq('id', id)
          .maybeSingle();

        if (duplicate) {
          const conflictError: any = new Error(`Warehouse with code '${normalizedCode}' already exists in this organization`);
          conflictError.status = 409;
          throw conflictError;
        }
      }
      updatePayload.code = normalizedCode;
    }

    if (dto.address !== undefined) {
      updatePayload.address = dto.address ? dto.address.trim() : null;
    }

    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }

    const { data, error } = await this.db
      .from('warehouses')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const conflictError: any = new Error('Warehouse code already exists');
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }

    return data;
  }

  async getLocationsForWarehouse(orgId: string, warehouseId: string) {
    // Ensure warehouse belongs to org
    const { data: warehouse } = await this.db
      .from('warehouses')
      .select('id')
      .eq('id', warehouseId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!warehouse) {
      const notFoundError: any = new Error('Warehouse not found in current organization');
      notFoundError.status = 404;
      throw notFoundError;
    }

    const { data, error } = await this.db
      .from('locations')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
