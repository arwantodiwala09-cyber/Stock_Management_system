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
export declare class WarehouseService {
    private db;
    constructor(db: SupabaseClient);
    listWarehouses(orgId: string, params: WarehouseListParams): Promise<{
        items: any[];
        total: number;
        page?: never;
        pageSize?: never;
        totalPages?: never;
    } | {
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getWarehouseById(orgId: string, id: string): Promise<any>;
    createWarehouse(orgId: string, dto: CreateWarehouseDTO): Promise<any>;
    updateWarehouse(orgId: string, id: string, dto: UpdateWarehouseDTO): Promise<any>;
    getLocationsForWarehouse(orgId: string, warehouseId: string): Promise<any[]>;
}
//# sourceMappingURL=warehouse.service.d.ts.map