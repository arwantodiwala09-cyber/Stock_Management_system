import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Returns a Supabase client scoped to the authenticated user's token (RLS enforced).
 * Falls back to admin client if token is not present (with warning).
 */
export declare const getDbClient: (req: Request) => SupabaseClient;
//# sourceMappingURL=db.d.ts.map