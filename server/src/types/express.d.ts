import { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
      organizationId?: string;
      membership?: {
        role_id: string;
        permissions: string[];
      };
    }
  }
}
