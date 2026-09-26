import type { SupabaseClient } from '@supabase/supabase-js';
export interface LocationListParams {
    warehouseId?: string | undefined;
    search?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    all?: boolean | undefined;
}
export interface CreateLocationDTO {
    warehouse_id: string;
    name: string;
    code: string;
    type?: string | undefined;
    status?: string | undefined;
}
export interface UpdateLocationDTO {
    name?: string | undefined;
    code?: string | undefined;
    type?: string | undefined;
    status?: string | undefined;
}
export declare class LocationService {
    private db;
    constructor(db: SupabaseClient);
    listLocations(orgId: string, params: LocationListParams): Promise<{
        page?: never;
        pageSize?: never;
        totalPages?: never;
        items: any[];
        total: number;
    } | {
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getLocationById(orgId: string, id: string): Promise<any>;
    createLocation(orgId: string, dto: CreateLocationDTO): Promise<any>;
    updateLocation(orgId: string, id: string, dto: UpdateLocationDTO): Promise<any>;
}
//# sourceMappingURL=location.service.d.ts.map