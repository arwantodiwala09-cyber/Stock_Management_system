import type { SupabaseClient } from '@supabase/supabase-js';
export declare function generateDocumentNumber(db: SupabaseClient, table: 'receipts' | 'deliveries' | 'transfers' | 'adjustments', field: 'receipt_number' | 'delivery_number' | 'transfer_number' | 'adjustment_number', orgId: string, prefix: string): Promise<string>;
//# sourceMappingURL=numbering.d.ts.map