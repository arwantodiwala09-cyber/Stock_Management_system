import type { SupabaseClient } from '@supabase/supabase-js';
export interface CategoryListParams {
    search?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    all?: boolean | undefined;
}
export interface CreateCategoryDTO {
    name: string;
    description?: string | undefined;
    status?: string | undefined;
}
export interface UpdateCategoryDTO {
    name?: string | undefined;
    description?: string | undefined;
    status?: string | undefined;
}
export declare class CategoryService {
    private db;
    constructor(db: SupabaseClient);
    listCategories(orgId: string, params: CategoryListParams): Promise<{
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
    getCategoryById(orgId: string, id: string): Promise<any>;
    createCategory(orgId: string, dto: CreateCategoryDTO): Promise<any>;
    updateCategory(orgId: string, id: string, dto: UpdateCategoryDTO): Promise<any>;
}
//# sourceMappingURL=category.service.d.ts.map