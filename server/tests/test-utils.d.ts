export interface TestDataStore {
    organizations: any[];
    roles: any[];
    permissions: any[];
    role_permissions: any[];
    organization_members: any[];
    categories: any[];
    products: any[];
    warehouses: any[];
    locations: any[];
    stock: any[];
    receipts: any[];
    receipt_items: any[];
    deliveries: any[];
    delivery_items: any[];
    transfers: any[];
    transfer_items: any[];
    adjustments: any[];
    adjustment_items: any[];
    stock_ledger: any[];
}
export declare const createMockDataStore: () => TestDataStore;
export declare class MockSupabaseClient {
    private store;
    constructor(store: TestDataStore);
    rpc(funcName: string, args: any): Promise<{
        data: null;
        error: {
            message: string;
        };
    }>;
    from(table: keyof TestDataStore): any;
}
//# sourceMappingURL=test-utils.d.ts.map