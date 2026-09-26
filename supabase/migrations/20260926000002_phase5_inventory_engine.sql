-- Migration: Phase 5 Inventory Engine, Transaction Functions & Permissions

-- 1. Phase 5 Permissions
INSERT INTO permissions (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000020', 'receipts.update', 'Update draft receipts'),
  ('10000000-0000-0000-0000-000000000021', 'deliveries.read', 'Read deliveries'),
  ('10000000-0000-0000-0000-000000000022', 'deliveries.create', 'Create deliveries'),
  ('10000000-0000-0000-0000-000000000023', 'deliveries.update', 'Update draft deliveries'),
  ('10000000-0000-0000-0000-000000000024', 'deliveries.validate', 'Validate and execute deliveries'),
  ('10000000-0000-0000-0000-000000000025', 'transfers.read', 'Read transfers'),
  ('10000000-0000-0000-0000-000000000026', 'transfers.create', 'Create transfers'),
  ('10000000-0000-0000-0000-000000000027', 'transfers.update', 'Update draft transfers'),
  ('10000000-0000-0000-0000-000000000028', 'transfers.complete', 'Complete and execute transfers'),
  ('10000000-0000-0000-0000-000000000029', 'adjustments.read', 'Read adjustments'),
  ('10000000-0000-0000-0000-000000000030', 'adjustments.create', 'Create adjustments'),
  ('10000000-0000-0000-0000-000000000031', 'adjustments.update', 'Update draft adjustments'),
  ('10000000-0000-0000-0000-000000000032', 'adjustments.approve', 'Approve and execute stock adjustments'),
  ('10000000-0000-0000-0000-000000000033', 'ledger.read', 'Read permanent stock ledger')
ON CONFLICT (name) DO NOTHING;

-- 2. Role Permissions Mapping
-- Admin gets all
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id 
FROM permissions 
WHERE name IN (
  'receipts.update',
  'deliveries.read', 'deliveries.create', 'deliveries.update', 'deliveries.validate',
  'transfers.read', 'transfers.create', 'transfers.update', 'transfers.complete',
  'adjustments.read', 'adjustments.create', 'adjustments.update', 'adjustments.approve',
  'ledger.read'
)
ON CONFLICT DO NOTHING;

-- Inventory Manager gets all Phase 5 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id 
FROM permissions 
WHERE name IN (
  'receipts.read', 'receipts.create', 'receipts.update', 'receipts.validate',
  'deliveries.read', 'deliveries.create', 'deliveries.update', 'deliveries.validate',
  'transfers.read', 'transfers.create', 'transfers.update', 'transfers.complete',
  'adjustments.read', 'adjustments.create', 'adjustments.update', 'adjustments.approve',
  'ledger.read', 'inventory.read'
)
ON CONFLICT DO NOTHING;

-- Warehouse Staff gets operational read/create permissions, but CANNOT approve adjustments or complete sensitive transactions without manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id 
FROM permissions 
WHERE name IN (
  'receipts.read', 'receipts.create',
  'deliveries.read', 'deliveries.create',
  'transfers.read', 'transfers.create',
  'adjustments.read',
  'ledger.read', 'inventory.read'
)
ON CONFLICT DO NOTHING;

-- 3. Atomic PostgreSQL RPC Function: Validate Receipt
CREATE OR REPLACE FUNCTION public.rpc_validate_receipt(
  p_org_id UUID,
  p_receipt_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_item RECORD;
  v_old_qty NUMERIC(15, 2);
  v_new_qty NUMERIC(15, 2);
  v_stock_id UUID;
BEGIN
  -- 1. Lock and fetch receipt
  SELECT * INTO v_receipt
  FROM receipts
  WHERE id = p_receipt_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECEIPT_NOT_FOUND: Receipt does not exist in this organization';
  END IF;

  IF v_receipt.status = 'completed' OR v_receipt.status = 'validated' THEN
    RAISE EXCEPTION 'TRANSACTION_ALREADY_COMPLETED: Receipt % has already been validated', v_receipt.receipt_number;
  END IF;

  -- 2. Process each item atomically
  FOR v_item IN
    SELECT ri.*, p.name as product_name
    FROM receipt_items ri
    JOIN products p ON p.id = ri.product_id
    WHERE ri.receipt_id = p_receipt_id
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than zero for %', v_item.product_name;
    END IF;

    -- Lock or insert stock row
    SELECT id, quantity INTO v_stock_id, v_old_qty
    FROM stock
    WHERE organization_id = p_org_id
      AND product_id = v_item.product_id
      AND location_id = v_item.location_id
    FOR UPDATE;

    IF FOUND THEN
      v_new_qty := v_old_qty + v_item.quantity;
      UPDATE stock
      SET quantity = v_new_qty, updated_at = NOW()
      WHERE id = v_stock_id;
    ELSE
      v_old_qty := 0;
      v_new_qty := v_item.quantity;
      INSERT INTO stock (
        organization_id, product_id, warehouse_id, location_id, quantity, created_at, updated_at
      ) VALUES (
        p_org_id, v_item.product_id, v_receipt.warehouse_id, v_item.location_id, v_new_qty, NOW(), NOW()
      );
    END IF;

    -- Create Ledger Entry
    INSERT INTO stock_ledger (
      organization_id, product_id, warehouse_id, location_id,
      transaction_type, reference_type, reference_id,
      quantity_change, previous_quantity, new_quantity,
      reason, performed_by, created_at
    ) VALUES (
      p_org_id, v_item.product_id, v_receipt.warehouse_id, v_item.location_id,
      'receipt', 'receipt', p_receipt_id,
      v_item.quantity, v_old_qty, v_new_qty,
      COALESCE(v_receipt.notes, 'Receipt ' || v_receipt.receipt_number), p_user_id, NOW()
    );
  END LOOP;

  -- 3. Update receipt status
  UPDATE receipts
  SET status = 'completed',
      validated_by = p_user_id,
      validated_at = NOW(),
      updated_at = NOW()
  WHERE id = p_receipt_id;

  RETURN jsonb_build_object('success', true, 'receipt_id', p_receipt_id, 'status', 'completed');
END;
$$;

-- 4. Atomic PostgreSQL RPC Function: Validate Delivery
CREATE OR REPLACE FUNCTION public.rpc_validate_delivery(
  p_org_id UUID,
  p_delivery_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery RECORD;
  v_item RECORD;
  v_old_qty NUMERIC(15, 2);
  v_new_qty NUMERIC(15, 2);
  v_stock_id UUID;
BEGIN
  -- 1. Lock and fetch delivery
  SELECT * INTO v_delivery
  FROM deliveries
  WHERE id = p_delivery_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND: Delivery does not exist in this organization';
  END IF;

  IF v_delivery.status = 'completed' OR v_delivery.status = 'validated' THEN
    RAISE EXCEPTION 'TRANSACTION_ALREADY_COMPLETED: Delivery % has already been validated', v_delivery.delivery_number;
  END IF;

  -- 2. Process each item atomically
  FOR v_item IN
    SELECT di.*, p.name as product_name
    FROM delivery_items di
    JOIN products p ON p.id = di.product_id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than zero for %', v_item.product_name;
    END IF;

    -- Lock stock row
    SELECT id, quantity INTO v_stock_id, v_old_qty
    FROM stock
    WHERE organization_id = p_org_id
      AND product_id = v_item.product_id
      AND location_id = v_item.location_id
    FOR UPDATE;

    IF NOT FOUND OR v_old_qty < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: Insufficient stock for product "%" at requested location. Available: %, Requested: %',
        v_item.product_name, COALESCE(v_old_qty, 0), v_item.quantity;
    END IF;

    v_new_qty := v_old_qty - v_item.quantity;
    UPDATE stock
    SET quantity = v_new_qty, updated_at = NOW()
    WHERE id = v_stock_id;

    -- Create Ledger Entry
    INSERT INTO stock_ledger (
      organization_id, product_id, warehouse_id, location_id,
      transaction_type, reference_type, reference_id,
      quantity_change, previous_quantity, new_quantity,
      reason, performed_by, created_at
    ) VALUES (
      p_org_id, v_item.product_id, v_delivery.warehouse_id, v_item.location_id,
      'delivery', 'delivery', p_delivery_id,
      -v_item.quantity, v_old_qty, v_new_qty,
      COALESCE(v_delivery.notes, 'Delivery ' || v_delivery.delivery_number), p_user_id, NOW()
    );
  END LOOP;

  -- 3. Update delivery status
  UPDATE deliveries
  SET status = 'completed',
      validated_by = p_user_id,
      validated_at = NOW(),
      updated_at = NOW()
  WHERE id = p_delivery_id;

  RETURN jsonb_build_object('success', true, 'delivery_id', p_delivery_id, 'status', 'completed');
END;
$$;

-- 5. Atomic PostgreSQL RPC Function: Complete Transfer
CREATE OR REPLACE FUNCTION public.rpc_complete_transfer(
  p_org_id UUID,
  p_transfer_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
  v_item RECORD;
  v_src_stock_id UUID;
  v_src_old_qty NUMERIC(15, 2);
  v_src_new_qty NUMERIC(15, 2);
  v_dst_stock_id UUID;
  v_dst_old_qty NUMERIC(15, 2);
  v_dst_new_qty NUMERIC(15, 2);
BEGIN
  -- 1. Lock and fetch transfer
  SELECT * INTO v_transfer
  FROM transfers
  WHERE id = p_transfer_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_NOT_FOUND: Transfer does not exist in this organization';
  END IF;

  IF v_transfer.status = 'completed' THEN
    RAISE EXCEPTION 'TRANSACTION_ALREADY_COMPLETED: Transfer % has already been completed', v_transfer.transfer_number;
  END IF;

  -- 2. Process each item atomically
  FOR v_item IN
    SELECT ti.*, p.name as product_name
    FROM transfer_items ti
    JOIN products p ON p.id = ti.product_id
    WHERE ti.transfer_id = p_transfer_id
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than zero for %', v_item.product_name;
    END IF;

    IF v_item.source_location_id = v_item.destination_location_id THEN
      RAISE EXCEPTION 'SAME_LOCATION_TRANSFER_REJECTED: Source and destination locations cannot be identical for %', v_item.product_name;
    END IF;

    -- Lock source stock
    SELECT id, quantity INTO v_src_stock_id, v_src_old_qty
    FROM stock
    WHERE organization_id = p_org_id
      AND product_id = v_item.product_id
      AND location_id = v_item.source_location_id
    FOR UPDATE;

    IF NOT FOUND OR v_src_old_qty < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: Insufficient stock at source location for "%". Available: %, Requested: %',
        v_item.product_name, COALESCE(v_src_old_qty, 0), v_item.quantity;
    END IF;

    -- Deduct from source
    v_src_new_qty := v_src_old_qty - v_item.quantity;
    UPDATE stock
    SET quantity = v_src_new_qty, updated_at = NOW()
    WHERE id = v_src_stock_id;

    -- Add to destination
    SELECT id, quantity INTO v_dst_stock_id, v_dst_old_qty
    FROM stock
    WHERE organization_id = p_org_id
      AND product_id = v_item.product_id
      AND location_id = v_item.destination_location_id
    FOR UPDATE;

    IF FOUND THEN
      v_dst_new_qty := v_dst_old_qty + v_item.quantity;
      UPDATE stock
      SET quantity = v_dst_new_qty, updated_at = NOW()
      WHERE id = v_dst_stock_id;
    ELSE
      v_dst_old_qty := 0;
      v_dst_new_qty := v_item.quantity;
      INSERT INTO stock (
        organization_id, product_id, warehouse_id, location_id, quantity, created_at, updated_at
      ) VALUES (
        p_org_id, v_item.product_id, v_transfer.destination_warehouse_id, v_item.destination_location_id, v_dst_new_qty, NOW(), NOW()
      );
    END IF;

    -- Source Ledger Entry
    INSERT INTO stock_ledger (
      organization_id, product_id, warehouse_id, location_id,
      transaction_type, reference_type, reference_id,
      quantity_change, previous_quantity, new_quantity,
      reason, performed_by, created_at
    ) VALUES (
      p_org_id, v_item.product_id, v_transfer.source_warehouse_id, v_item.source_location_id,
      'transfer', 'transfer', p_transfer_id,
      -v_item.quantity, v_src_old_qty, v_src_new_qty,
      'Transfer out ' || v_transfer.transfer_number, p_user_id, NOW()
    );

    -- Destination Ledger Entry
    INSERT INTO stock_ledger (
      organization_id, product_id, warehouse_id, location_id,
      transaction_type, reference_type, reference_id,
      quantity_change, previous_quantity, new_quantity,
      reason, performed_by, created_at
    ) VALUES (
      p_org_id, v_item.product_id, v_transfer.destination_warehouse_id, v_item.destination_location_id,
      'transfer', 'transfer', p_transfer_id,
      v_item.quantity, v_dst_old_qty, v_dst_new_qty,
      'Transfer in ' || v_transfer.transfer_number, p_user_id, NOW()
    );
  END LOOP;

  -- 3. Update transfer status
  UPDATE transfers
  SET status = 'completed',
      completed_by = p_user_id,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', 'completed');
END;
$$;

-- 6. Atomic PostgreSQL RPC Function: Approve Adjustment
CREATE OR REPLACE FUNCTION public.rpc_approve_adjustment(
  p_org_id UUID,
  p_adjustment_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adj RECORD;
  v_item RECORD;
  v_stock_id UUID;
  v_old_qty NUMERIC(15, 2);
  v_diff NUMERIC(15, 2);
BEGIN
  -- 1. Lock and fetch adjustment
  SELECT * INTO v_adj
  FROM adjustments
  WHERE id = p_adjustment_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADJUSTMENT_NOT_FOUND: Adjustment does not exist in this organization';
  END IF;

  IF v_adj.status = 'completed' OR v_adj.status = 'approved' THEN
    RAISE EXCEPTION 'TRANSACTION_ALREADY_COMPLETED: Adjustment % has already been approved', v_adj.adjustment_number;
  END IF;

  -- 2. Process each item atomically
  FOR v_item IN
    SELECT ai.*, p.name as product_name
    FROM adjustment_items ai
    JOIN products p ON p.id = ai.product_id
    WHERE ai.adjustment_id = p_adjustment_id
  LOOP
    IF v_item.physical_quantity < 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Physical quantity cannot be negative for %', v_item.product_name;
    END IF;

    -- Lock stock row
    SELECT id, quantity INTO v_stock_id, v_old_qty
    FROM stock
    WHERE organization_id = p_org_id
      AND product_id = v_item.product_id
      AND location_id = v_item.location_id
    FOR UPDATE;

    IF FOUND THEN
      v_diff := v_item.physical_quantity - v_old_qty;
      UPDATE stock
      SET quantity = v_item.physical_quantity, updated_at = NOW()
      WHERE id = v_stock_id;
    ELSE
      v_old_qty := 0;
      v_diff := v_item.physical_quantity;
      INSERT INTO stock (
        organization_id, product_id, warehouse_id, location_id, quantity, created_at, updated_at
      ) VALUES (
        p_org_id, v_item.product_id, v_adj.warehouse_id, v_item.location_id, v_item.physical_quantity, NOW(), NOW()
      );
    END IF;

    -- Sync difference and system_quantity on adjustment item
    UPDATE adjustment_items
    SET system_quantity = v_old_qty,
        difference = v_diff
    WHERE id = v_item.id;

    -- Ledger entry
    IF v_diff <> 0 THEN
      INSERT INTO stock_ledger (
        organization_id, product_id, warehouse_id, location_id,
        transaction_type, reference_type, reference_id,
        quantity_change, previous_quantity, new_quantity,
        reason, performed_by, created_at
      ) VALUES (
        p_org_id, v_item.product_id, v_adj.warehouse_id, v_item.location_id,
        'adjustment', 'adjustment', p_adjustment_id,
        v_diff, v_old_qty, v_item.physical_quantity,
        COALESCE(v_adj.reason, 'Adjustment ' || v_adj.adjustment_number), p_user_id, NOW()
      );
    END IF;
  END LOOP;

  -- 3. Update adjustment status
  UPDATE adjustments
  SET status = 'completed',
      approved_by = p_user_id,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_adjustment_id;

  RETURN jsonb_build_object('success', true, 'adjustment_id', p_adjustment_id, 'status', 'completed');
END;
$$;
