import { supabaseAdmin, createScopedClient } from '../config/supabase.js';
/**
 * Returns a Supabase client scoped to the authenticated user's token (RLS enforced).
 * Falls back to admin client if token is not present (with warning).
 */
export const getDbClient = (req) => {
    if (req.token) {
        return createScopedClient(req.token);
    }
    return supabaseAdmin;
};
//# sourceMappingURL=db.js.map