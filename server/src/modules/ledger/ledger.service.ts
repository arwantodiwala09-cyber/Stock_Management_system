import type { SupabaseClient } from '@supabase/supabase-js';

export interface LedgerListParams {
  productId?: string | undefined;
  warehouseId?: string | undefined;
  locationId?: string | undefined;
  transactionType?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export class LedgerService {
  constructor(private db: SupabaseClient) {}

  async listLedger(orgId: string, params: LedgerListParams) {
    let query = this.db
      .from('stock_ledger')
      .select(`
        *,
        products (id, name, sku, unit_of_measure),
        warehouses (id, name, code),
        locations (id, name, code, type)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    const productId = params.productId || (params as any).product_id;
    if (productId && productId !== 'all') {
      query = query.eq('product_id', productId);
    }

    const warehouseId = params.warehouseId || (params as any).warehouse_id;
    if (warehouseId && warehouseId !== 'all') {
      query = query.eq('warehouse_id', warehouseId);
    }

    const locationId = params.locationId || (params as any).location_id;
    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const transactionType = params.transactionType || (params as any).transaction_type;
    if (transactionType && transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`reason.ilike.%${s}%,transaction_type.ilike.%${s}%`);
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

  async getLedgerById(orgId: string, id: string) {
    const { data, error } = await this.db
      .from('stock_ledger')
      .select(`
        *,
        products (id, name, sku, unit_of_measure),
        warehouses (id, name, code),
        locations (id, name, code, type)
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
