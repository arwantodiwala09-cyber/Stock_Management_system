import type { SupabaseClient } from '@supabase/supabase-js';
export interface ReceiptItemInput {
    product_id: string;
    location_id: string;
    quantity: number;
    unit_info?: string | undefined;
}
export interface CreateReceiptDTO {
    receipt_number?: string | undefined;
    supplier_info?: string | undefined;
    warehouse_id: string;
    notes?: string | undefined;
    items: ReceiptItemInput[];
}
export interface UpdateReceiptDTO {
    supplier_info?: string | undefined;
    notes?: string | undefined;
    items?: ReceiptItemInput[] | undefined;
}
export interface ReceiptListParams {
    search?: string | undefined;
    status?: string | undefined;
    warehouseId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}
export declare class ReceiptService {
    private db;
    constructor(db: SupabaseClient);
    listReceipts(orgId: string, params: ReceiptListParams): Promise<{
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getReceiptById(orgId: string, id: string): Promise<any>;
    createReceipt(orgId: string, userId: string, dto: CreateReceiptDTO): Promise<any>;
    updateReceipt(orgId: string, id: string, dto: UpdateReceiptDTO): Promise<any>;
    validateReceipt(orgId: string, id: string, userId: string): Promise<any>;
}
//# sourceMappingURL=receipt.service.d.ts.map