-- Migration: Initial Schema for StockSense

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Helper function for RLS


-- 2. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Roles and Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Organization Members
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users in Supabase
    role_id UUID NOT NULL REFERENCES roles(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_members.organization_id = org_id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
  );
$$;

-- 5. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 6. Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'pcs',
    reorder_level NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    image_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, sku)
);

-- 7. Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- 8. Locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'storage',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, warehouse_id, code)
);

-- 9. Stock
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, product_id, location_id)
);

-- 10. Receipts
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL,
    supplier_info TEXT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID,
    validated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    UNIQUE(organization_id, receipt_number)
);

CREATE TABLE receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    unit_info VARCHAR(50)
);

-- 11. Deliveries
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    delivery_number VARCHAR(100) NOT NULL,
    customer_info TEXT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID,
    validated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    UNIQUE(organization_id, delivery_number)
);

CREATE TABLE delivery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0)
);

-- 12. Transfers
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transfer_number VARCHAR(100) NOT NULL,
    source_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID,
    completed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(organization_id, transfer_number)
);

CREATE TABLE transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    source_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    destination_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0)
);

-- 13. Adjustments
CREATE TABLE adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    adjustment_number VARCHAR(100) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    reason VARCHAR(255),
    notes TEXT,
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    UNIQUE(organization_id, adjustment_number)
);

CREATE TABLE adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    system_quantity NUMERIC(15, 2) NOT NULL,
    physical_quantity NUMERIC(15, 2) NOT NULL,
    difference NUMERIC(15, 2) NOT NULL
);

-- 14. Stock Ledger
CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    quantity_change NUMERIC(15, 2) NOT NULL,
    previous_quantity NUMERIC(15, 2) NOT NULL,
    new_quantity NUMERIC(15, 2) NOT NULL,
    reason VARCHAR(255),
    performed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Activity & Audit
CREATE TABLE activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    storage_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Saved Views
CREATE TABLE saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    filter_config JSONB,
    sort_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    parameters JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_categories_org ON categories(organization_id);
CREATE INDEX idx_products_org_cat ON products(organization_id, category_id);
CREATE INDEX idx_products_sku ON products(organization_id, sku);
CREATE INDEX idx_warehouses_org ON warehouses(organization_id);
CREATE INDEX idx_locations_org_wh ON locations(organization_id, warehouse_id);
CREATE INDEX idx_stock_org_prod_loc ON stock(organization_id, product_id, location_id);
CREATE INDEX idx_ledger_org_time ON stock_ledger(organization_id, created_at DESC);
CREATE INDEX idx_ledger_prod_time ON stock_ledger(product_id, created_at DESC);
CREATE INDEX idx_receipts_org_status ON receipts(organization_id, status);
CREATE INDEX idx_deliveries_org_status ON deliveries(organization_id, status);
CREATE INDEX idx_transfers_org_status ON transfers(organization_id, status);
CREATE INDEX idx_adjustments_org_status ON adjustments(organization_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX idx_audit_org_time ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_activity_org_time ON activity_events(organization_id, created_at DESC);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- ENABLE RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Global tables readable by all authenticated users
CREATE POLICY "Allow read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- Tenants: user must be member
CREATE POLICY "Org access" ON organizations FOR ALL TO authenticated USING (public.is_org_member(id));
CREATE POLICY "Org members access" ON organization_members FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Standard tenant tables
CREATE POLICY "Tenant categories" ON categories FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant products" ON products FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant warehouses" ON warehouses FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant locations" ON locations FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant stock" ON stock FOR ALL TO authenticated USING (public.is_org_member(organization_id));

-- Documents
CREATE POLICY "Tenant receipts" ON receipts FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant receipt items" ON receipt_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM receipts WHERE receipts.id = receipt_items.receipt_id AND public.is_org_member(receipts.organization_id))
);

CREATE POLICY "Tenant deliveries" ON deliveries FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant delivery items" ON delivery_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM deliveries WHERE deliveries.id = delivery_items.delivery_id AND public.is_org_member(deliveries.organization_id))
);

CREATE POLICY "Tenant transfers" ON transfers FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant transfer items" ON transfer_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM transfers WHERE transfers.id = transfer_items.transfer_id AND public.is_org_member(transfers.organization_id))
);

CREATE POLICY "Tenant adjustments" ON adjustments FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant adjustment items" ON adjustment_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM adjustments WHERE adjustments.id = adjustment_items.adjustment_id AND public.is_org_member(adjustments.organization_id))
);

-- Ledger (Append only for users, but simplified to ALL for now or strictly SELECT/INSERT)
CREATE POLICY "Tenant ledger read" ON stock_ledger FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant ledger insert" ON stock_ledger FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
-- Intentionally omitting UPDATE/DELETE policies for stock_ledger to enforce append-only

-- Notifications
CREATE POLICY "Tenant notifications" ON notifications FOR ALL TO authenticated USING (public.is_org_member(organization_id) AND user_id = auth.uid());
CREATE POLICY "Tenant notification rules" ON notification_rules FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "User notification preferences" ON notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid());

-- Activity & Audit
CREATE POLICY "Tenant activity read" ON activity_events FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant activity insert" ON activity_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Tenant audit read" ON audit_logs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant audit insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

-- Others
CREATE POLICY "Tenant comments" ON comments FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant attachments" ON attachments FOR ALL TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Tenant saved views" ON saved_views FOR ALL TO authenticated USING (public.is_org_member(organization_id) AND user_id = auth.uid());
CREATE POLICY "Tenant reports" ON reports FOR ALL TO authenticated USING (public.is_org_member(organization_id));

