-- Migration: Phase 4 Master Data Schema Update & Permissions

-- 1. Add status to categories if not already present
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';

-- 2. Add Phase 4 Permissions
INSERT INTO permissions (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000010', 'categories.read', 'Read categories'),
  ('10000000-0000-0000-0000-000000000011', 'categories.create', 'Create categories'),
  ('10000000-0000-0000-0000-000000000012', 'categories.update', 'Update categories'),
  ('10000000-0000-0000-0000-000000000013', 'categories.delete', 'Delete categories'),
  ('10000000-0000-0000-0000-000000000014', 'warehouses.read', 'Read warehouses and locations'),
  ('10000000-0000-0000-0000-000000000015', 'warehouses.create', 'Create warehouses and locations'),
  ('10000000-0000-0000-0000-000000000016', 'warehouses.update', 'Update warehouses and locations'),
  ('10000000-0000-0000-0000-000000000017', 'warehouses.delete', 'Delete warehouses and locations')
ON CONFLICT (name) DO NOTHING;

-- 3. Map permissions to roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id 
FROM permissions 
WHERE name IN (
  'categories.read', 'categories.create', 'categories.update', 'categories.delete',
  'warehouses.read', 'warehouses.create', 'warehouses.update', 'warehouses.delete'
)
ON CONFLICT DO NOTHING;

-- Inventory Manager gets product, category, warehouse, location, and inventory permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id 
FROM permissions 
WHERE name IN (
  'products.read', 'products.create', 'products.update',
  'categories.read', 'categories.create', 'categories.update',
  'warehouses.read', 'warehouses.create', 'warehouses.update',
  'inventory.read'
)
ON CONFLICT DO NOTHING;

-- Warehouse Staff gets read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id 
FROM permissions 
WHERE name IN (
  'products.read',
  'categories.read',
  'warehouses.read',
  'inventory.read'
)
ON CONFLICT DO NOTHING;
