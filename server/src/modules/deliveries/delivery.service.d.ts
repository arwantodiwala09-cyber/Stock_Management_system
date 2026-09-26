import type { SupabaseClient } from '@supabase/supabase-js';
export interface DeliveryItemInput {
    product_id: string;
    location_id: string;
    quantity: number;
}
export interface CreateDeliveryDTO {
    delivery_number?: string | undefined;
    customer_info?: string | undefined;
    warehouse_id: string;
    notes?: string | undefined;
    items: DeliveryItemInput[];
}
export interface UpdateDeliveryDTO {
    customer_info?: string | undefined;
    notes?: string | undefined;
    items?: DeliveryItemInput[] | undefined;
}
export interface DeliveryListParams {
    search?: string | undefined;
    status?: string | undefined;
    warehouseId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}
export declare class DeliveryService {
    private db;
    constructor(db: SupabaseClient);
    listDeliveries(orgId: string, params: DeliveryListParams): Promise<{
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getDeliveryById(orgId: string, id: string): Promise<any>;
    createDelivery(orgId: string, userId: string, dto: CreateDeliveryDTO): Promise<any>;
    updateDelivery(orgId: string, id: string, dto: UpdateDeliveryDTO): Promise<any>;
    validateDelivery(orgId: string, id: string, userId: string): Promise<any>;
}
//# sourceMappingURL=delivery.service.d.ts.map