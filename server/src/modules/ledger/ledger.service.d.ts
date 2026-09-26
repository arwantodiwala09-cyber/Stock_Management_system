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
export declare class LedgerService {
    private db;
    constructor(db: SupabaseClient);
    listLedger(orgId: string, params: LedgerListParams): Promise<{
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getLedgerById(orgId: string, id: string): Promise<any>;
}
//# sourceMappingURL=ledger.service.d.ts.map