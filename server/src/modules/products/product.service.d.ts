import type { SupabaseClient } from '@supabase/supabase-js';
export interface ProductListParams {
    search?: string | undefined;
    categoryId?: string | undefined;
    status?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    all?: boolean | undefined;
}
export interface CreateProductDTO {
    sku: string;
    name: string;
    description?: string | null | undefined;
    category_id?: string | null | undefined;
    unit_of_measure?: string | undefined;
    reorder_level?: number | undefined;
    status?: string | undefined;
    image_path?: string | null | undefined;
}
export interface UpdateProductDTO {
    sku?: string | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    category_id?: string | null | undefined;
    unit_of_measure?: string | undefined;
    reorder_level?: number | undefined;
    status?: string | undefined;
    image_path?: string | null | undefined;
}
export declare class ProductService {
    private db;
    constructor(db: SupabaseClient);
    listProducts(orgId: string, params: ProductListParams): Promise<{
        page?: never;
        pageSize?: never;
        totalPages?: never;
        items: {
            categories: {
                id: any;
                name: any;
            }[];
            created_at: any;
            id: any;
            image_path: any;
            name: any;
            reorder_level: any;
            sku: any;
            status: any;
            unit_of_measure: any;
        }[];
        total: number;
    } | {
        items: {
            categories: {
                id: any;
                name: any;
            }[];
            created_at: any;
            id: any;
            image_path: any;
            name: any;
            reorder_level: any;
            sku: any;
            status: any;
            unit_of_measure: any;
        }[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getProductById(orgId: string, id: string): Promise<any>;
    createProduct(orgId: string, dto: CreateProductDTO): Promise<any>;
    updateProduct(orgId: string, id: string, dto: UpdateProductDTO): Promise<any>;
}
//# sourceMappingURL=product.service.d.ts.map