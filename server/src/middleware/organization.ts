import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export const requireOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.headers['x-organization-id'] as string;

    if (!orgId) {
      res.status(400).json({ error: 'Missing x-organization-id header' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User not found in request context' });
      return;
    }

    // Verify organization membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role_id, status')
      .eq('organization_id', orgId)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      // Return 404 or 403. Returning 404 prevents leaking existence of orgs the user doesn't belong to.
      res.status(404).json({ error: 'Organization not found or access denied' });
      return;
    }

    // Fetch permissions for the role
    const { data: rolePermissions, error: permissionsError } = await supabaseAdmin
      .from('role_permissions')
      .select(`
        permissions (
          name
        )
      `)
      .eq('role_id', membership.role_id);

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError);
      res.status(500).json({ error: 'Failed to resolve permissions' });
      return;
    }

    // Extract permission names
    const permissions = rolePermissions
      .map((rp: any) => rp.permissions?.name)
      .filter(Boolean) as string[];

    req.organizationId = orgId;
    req.membership = {
      role_id: membership.role_id,
      permissions,
    };

    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    res.status(500).json({ error: 'Internal server error during organization resolution' });
  }
};
