import type { SupabaseClient } from '@supabase/supabase-js';

export interface StockListParams {
  search?: string | undefined;
  productId?: string | undefined;
  warehouseId?: string | undefined;
  locationId?: string | undefined;
  stockStatus?: 'out_of_stock' | 'low_stock' | 'healthy' | 'all' | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}


export class StockService {
  constructor(private db: SupabaseClient) {}

  async listStock(orgId: string, params: StockListParams) {
    let query = this.db
      .from('stock')
      .select(`
        id,
        quantity,
        created_at,
        updated_at,
        products!inner (
          id,
          sku,
          name,
          unit_of_measure,
          reorder_level,
          status
        ),
        warehouses!inner (
          id,
          name,
          code
        ),
        locations!inner (
          id,
          name,
          code,
          type
        )
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    if (params.productId && params.productId !== 'all') {
      query = query.eq('product_id', params.productId);
    }

    if (params.warehouseId && params.warehouseId !== 'all') {
      query = query.eq('warehouse_id', params.warehouseId);
    }

    if (params.locationId && params.locationId !== 'all') {
      query = query.eq('location_id', params.locationId);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(
        `products.name.ilike.%${s}%,products.sku.ilike.%${s}%,warehouses.name.ilike.%${s}%,locations.name.ilike.%${s}%`
      );
    }

    // Default sorting
    const sortOrder = params.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    if (params.sortBy === 'quantity') {
      query = query.order('quantity', sortOrder);
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    // Execute query to get raw items
    const { data: rawData, count, error } = await query;
    if (error) throw error;

    // Derive status and format items
    let items = (rawData || []).map((row: any) => {
      const qty = Number(row.quantity || 0);
      const reorderLevel = Number(row.products?.reorder_level || 0);

      let status: 'Out of Stock' | 'Low Stock' | 'Healthy' = 'Healthy';
      let statusKey: 'out_of_stock' | 'low_stock' | 'healthy' = 'healthy';

      if (qty === 0) {
        status = 'Out of Stock';
        statusKey = 'out_of_stock';
      } else if (qty <= reorderLevel) {
        status = 'Low Stock';
        statusKey = 'low_stock';
      }

      return {
        id: row.id,
        quantity: qty,
        product: row.products,
        warehouse: row.warehouses,
        location: row.locations,
        reorder_level: reorderLevel,
        status,
        statusKey,
        updated_at: row.updated_at,
      };
    });

    // Filter by stock status if requested
    if (params.stockStatus && params.stockStatus !== 'all') {
      items = items.filter((item) => item.statusKey === params.stockStatus);
    }

    // Apply pagination over filtered result
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const total = params.stockStatus && params.stockStatus !== 'all' ? items.length : (count || items.length);

    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
