-- Ensure organization admins receive the full permissions implied by their role.
INSERT INTO public.permissions (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'products.read', 'Read products'),
  ('10000000-0000-0000-0000-000000000002', 'products.create', 'Create products'),
  ('10000000-0000-0000-0000-000000000003', 'products.update', 'Update products'),
  ('10000000-0000-0000-0000-000000000004', 'products.delete', 'Delete products'),
  ('10000000-0000-0000-0000-000000000005', 'inventory.read', 'Read inventory levels'),
  ('10000000-0000-0000-0000-000000000006', 'receipts.read', 'Read receipts'),
  ('10000000-0000-0000-0000-000000000007', 'receipts.create', 'Create receipts'),
  ('10000000-0000-0000-0000-000000000008', 'receipts.validate', 'Validate receipts')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM public.roles
CROSS JOIN public.permissions
WHERE roles.name = 'Organization Admin'
ON CONFLICT DO NOTHING;
