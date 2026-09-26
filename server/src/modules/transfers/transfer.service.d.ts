import type { SupabaseClient } from '@supabase/supabase-js';
export interface TransferItemInput {
    product_id: string;
    source_location_id: string;
    destination_location_id: string;
    quantity: number;
}
export interface CreateTransferDTO {
    transfer_number?: string | undefined;
    source_warehouse_id: string;
    destination_warehouse_id: string;
    notes?: string | undefined;
    items: TransferItemInput[];
}
export interface UpdateTransferDTO {
    notes?: string | undefined;
    items?: TransferItemInput[] | undefined;
}
export interface TransferListParams {
    search?: string | undefined;
    status?: string | undefined;
    sourceWarehouseId?: string | undefined;
    destinationWarehouseId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}
export declare class TransferService {
    private db;
    constructor(db: SupabaseClient);
    listTransfers(orgId: string, params: TransferListParams): Promise<{
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getTransferById(orgId: string, id: string): Promise<any>;
    createTransfer(orgId: string, userId: string, dto: CreateTransferDTO): Promise<any>;
    updateTransfer(orgId: string, id: string, dto: UpdateTransferDTO): Promise<any>;
    completeTransfer(orgId: string, id: string, userId: string): Promise<any>;
}
//# sourceMappingURL=transfer.service.d.ts.map