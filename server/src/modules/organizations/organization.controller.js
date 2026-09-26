import { supabaseAdmin } from '../../config/supabase.js';
import { z } from 'zod';
const createOrgSchema = z.object({
    name: z.string().min(2).max(255),
    slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});
export const createOrganization = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const result = createOrgSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: 'Validation failed', details: result.error.format() });
            return;
        }
        const { name, slug } = result.data;
        // Transaction is not natively supported by Supabase JS client easily across multiple tables without a function.
        // However, we can execute sequentially or use a Postgres function. We'll execute sequentially here and handle cleanup.
        // 1. Get Admin Role ID
        const { data: adminRole, error: roleError } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', 'Organization Admin')
            .single();
        if (roleError || !adminRole) {
            res.status(500).json({ error: 'Failed to resolve admin role' });
            return;
        }
        // 2. Create Org
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({ name, slug })
            .select()
            .single();
        if (orgError) {
            if (orgError.code === '23505') { // Unique violation
                res.status(409).json({ error: 'Organization slug already exists' });
                return;
            }
            console.error('Create org error:', orgError);
            res.status(500).json({ error: 'Failed to create organization' });
            return;
        }
        // 3. Create Membership
        const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
            organization_id: org.id,
            user_id: user.id,
            role_id: adminRole.id,
        });
        if (memberError) {
            // Rollback org creation if member fails
            await supabaseAdmin.from('organizations').delete().eq('id', org.id);
            console.error('Create member error:', memberError);
            res.status(500).json({ error: 'Failed to create organization membership' });
            return;
        }
        res.status(201).json(org);
    }
    catch (error) {
        console.error('createOrganization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const getUserOrganizations = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Join organizations with members where user is the member
        const { data, error } = await supabaseAdmin
            .from('organization_members')
            .select(`
        organization_id,
        status,
        organizations (
          id,
          name,
          slug,
          status
        ),
        roles (
          name
        )
      `)
            .eq('user_id', user.id)
            .eq('status', 'active');
        if (error) {
            console.error('getUserOrganizations error:', error);
            res.status(500).json({ error: 'Failed to fetch organizations' });
            return;
        }
        // Format the response
        const organizations = data.map((membership) => ({
            ...membership.organizations,
            role: membership.roles?.name,
        }));
        res.status(200).json(organizations);
    }
    catch (error) {
        console.error('getUserOrganizations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const getOrganizationMembers = async (req, res) => {
    try {
        const orgId = req.organizationId;
        // We can assume user is allowed to read members due to requirePermission middleware (users.read)
        const { data, error } = await supabaseAdmin
            .from('organization_members')
            .select(`
        id,
        user_id,
        status,
        created_at,
        roles (
          id,
          name
        )
      `)
            .eq('organization_id', orgId);
        if (error) {
            console.error('getOrganizationMembers error:', error);
            res.status(500).json({ error: 'Failed to fetch members' });
            return;
        }
        res.status(200).json(data);
    }
    catch (error) {
        console.error('getOrganizationMembers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//# sourceMappingURL=organization.controller.js.map