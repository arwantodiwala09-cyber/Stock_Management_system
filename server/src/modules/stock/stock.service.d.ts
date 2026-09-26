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
export declare class StockService {
    private db;
    constructor(db: SupabaseClient);
    listStock(orgId: string, params: StockListParams): Promise<{
        items: {
            id: any;
            quantity: number;
            product: any;
            warehouse: any;
            location: any;
            reorder_level: number;
            status: "Healthy" | "Low Stock" | "Out of Stock";
            statusKey: "healthy" | "low_stock" | "out_of_stock";
            updated_at: any;
        }[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=stock.service.d.ts.map