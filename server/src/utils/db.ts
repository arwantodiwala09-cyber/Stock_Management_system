import type { Request } from 'express';
import { supabaseAdmin, createScopedClient } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase client scoped to the authenticated user's token (RLS enforced).
 * Falls back to admin client if token is not present (with warning).
 */
export const getDbClient = (req: Request): SupabaseClient => {
  if (req.token) {
    return createScopedClient(req.token);
  }
  return supabaseAdmin;
};
