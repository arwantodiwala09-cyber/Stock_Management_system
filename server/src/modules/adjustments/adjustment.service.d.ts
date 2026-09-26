import type { SupabaseClient } from '@supabase/supabase-js';
export interface AdjustmentItemInput {
    product_id: string;
    location_id: string;
    physical_quantity: number;
}
export interface CreateAdjustmentDTO {
    adjustment_number?: string | undefined;
    warehouse_id: string;
    reason?: string | undefined;
    notes?: string | undefined;
    items: AdjustmentItemInput[];
}
export interface UpdateAdjustmentDTO {
    reason?: string | undefined;
    notes?: string | undefined;
    items?: AdjustmentItemInput[] | undefined;
}
export interface AdjustmentListParams {
    search?: string | undefined;
    status?: string | undefined;
    warehouseId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}
export declare class AdjustmentService {
    private db;
    constructor(db: SupabaseClient);
    listAdjustments(orgId: string, params: AdjustmentListParams): Promise<{
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getAdjustmentById(orgId: string, id: string): Promise<any>;
    createAdjustment(orgId: string, userId: string, dto: CreateAdjustmentDTO): Promise<any>;
    updateAdjustment(orgId: string, id: string, dto: UpdateAdjustmentDTO): Promise<any>;
    approveAdjustment(orgId: string, id: string, userId: string): Promise<any>;
}
//# sourceMappingURL=adjustment.service.d.ts.map