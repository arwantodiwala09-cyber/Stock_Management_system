-- Seed data for development
-- IMPORTANT: Do not use real credentials or secrets here.

-- 1. Roles
INSERT INTO roles (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Organization Admin', 'Full access to organization data'),
  ('22222222-2222-2222-2222-222222222222', 'Inventory Manager', 'Can manage products, locations, and inventory documents'),
  ('33333333-3333-3333-3333-333333333333', 'Warehouse Staff', 'Can process receipts and deliveries')
ON CONFLICT (id) DO NOTHING;

-- 2. Permissions
INSERT INTO permissions (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'products.read', 'Read products'),
  ('10000000-0000-0000-0000-000000000002', 'products.create', 'Create products'),
  ('10000000-0000-0000-0000-000000000003', 'products.update', 'Update products'),
  ('10000000-0000-0000-0000-000000000004', 'products.delete', 'Delete products'),
  ('10000000-0000-0000-0000-000000000005', 'inventory.read', 'Read inventory levels'),
  ('10000000-0000-0000-0000-000000000006', 'receipts.read', 'Read receipts'),
  ('10000000-0000-0000-0000-000000000007', 'receipts.create', 'Create receipts'),
  ('10000000-0000-0000-0000-000000000008', 'receipts.validate', 'Validate receipts'),
  ('10000000-0000-0000-0000-000000000010', 'categories.read', 'Read categories'),
  ('10000000-0000-0000-0000-000000000011', 'categories.create', 'Create categories'),
  ('10000000-0000-0000-0000-000000000012', 'categories.update', 'Update categories'),
  ('10000000-0000-0000-0000-000000000013', 'categories.delete', 'Delete categories'),
  ('10000000-0000-0000-0000-000000000014', 'warehouses.read', 'Read warehouses and locations'),
  ('10000000-0000-0000-0000-000000000015', 'warehouses.create', 'Create warehouses and locations'),
  ('10000000-0000-0000-0000-000000000016', 'warehouses.update', 'Update warehouses and locations'),
  ('10000000-0000-0000-0000-000000000017', 'warehouses.delete', 'Delete warehouses and locations')
ON CONFLICT (id) DO NOTHING;

-- 3. Role Permissions (Mapping)
-- Admin gets all
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM permissions
ON CONFLICT DO NOTHING;

-- Inventory Manager gets products, categories, warehouses, locations, and inventory levels
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM permissions
WHERE name IN (
  'products.read', 'products.create', 'products.update',
  'categories.read', 'categories.create', 'categories.update',
  'warehouses.read', 'warehouses.create', 'warehouses.update',
  'inventory.read'
)
ON CONFLICT DO NOTHING;

-- Warehouse Staff gets read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM permissions
WHERE name IN (
  'products.read',
  'categories.read',
  'warehouses.read',
  'inventory.read'
)
ON CONFLICT DO NOTHING;

-- Example Organization
INSERT INTO organizations (id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Demo Corp', 'demo-corp')
ON CONFLICT (id) DO NOTHING;

-- Example Warehouse
INSERT INTO warehouses (id, organization_id, name, code) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Main Warehouse', 'MAIN')
ON CONFLICT (id) DO NOTHING;

-- Example Location
INSERT INTO locations (id, organization_id, warehouse_id, name, code) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Aisle 1', 'A1')
ON CONFLICT (id) DO NOTHING;

-- Example Category
INSERT INTO categories (id, organization_id, name, status) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Electronics', 'active')
ON CONFLICT (id) DO NOTHING;

