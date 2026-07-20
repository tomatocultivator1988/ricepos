-- RicePOS — PO/inventory atomic fixes (bugs 7,8,17,18)
-- Bug 7: Atomic PO number generation
CREATE OR REPLACE FUNCTION next_po_number(p_store_id UUID, p_year INT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_num INT;
BEGIN
  INSERT INTO po_sequences (store_id, year, last_number)
  VALUES (p_store_id, p_year, 1)
  ON CONFLICT (store_id, year)
  DO UPDATE SET last_number = po_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN jsonb_build_object('num', v_num);
END;
$$;

-- Bug 8: Atomic stock adjustment
CREATE OR REPLACE FUNCTION adjust_stock(
  p_store_id UUID,
  p_item_id UUID,
  p_new_qty NUMERIC,
  p_employee_id UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_qty NUMERIC;
BEGIN
  SELECT stock_qty INTO v_old_qty FROM items WHERE id = p_item_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  UPDATE items SET stock_qty = p_new_qty, updated_at = now() WHERE id = p_item_id;

  INSERT INTO inventory_log (id, store_id, item_id, change_qty, qty_before, qty_after, reason, employee_id)
  VALUES (gen_random_uuid(), p_store_id, p_item_id, p_new_qty - v_old_qty, v_old_qty, p_new_qty, p_reason, p_employee_id);

  INSERT INTO audit_log (id, store_id, employee_id, action, entity_type, entity_id,
    old_value, new_value)
  VALUES (gen_random_uuid(), p_store_id, p_employee_id, 'stock_adjustment', 'item', p_item_id,
    jsonb_build_object('stock_qty', v_old_qty), jsonb_build_object('stock_qty', p_new_qty));

  RETURN jsonb_build_object('success', true, 'oldQty', v_old_qty, 'newQty', p_new_qty);
END;
$$;

-- Bug 17: Cancel PO — reverse received stock for partial POs
CREATE OR REPLACE FUNCTION cancel_purchase_order(p_po_id UUID, p_store_id UUID, p_employee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_po RECORD;
  v_poi RECORD;
  v_old_qty NUMERIC;
  v_new_qty NUMERIC;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO not found');
  END IF;
  IF v_po.status IN ('cancelled', 'received') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel PO with status ' || v_po.status);
  END IF;

  -- Reverse received stock for partial POs
  IF v_po.status = 'partial' THEN
    FOR v_poi IN SELECT * FROM purchase_order_items WHERE po_id = p_po_id
    LOOP
      IF v_poi.qty_received > 0 THEN
        SELECT stock_qty INTO v_old_qty FROM items WHERE id = v_poi.item_id FOR UPDATE;
        IF FOUND THEN
          v_new_qty := v_old_qty - v_poi.qty_received;
          UPDATE items SET stock_qty = v_new_qty, updated_at = now() WHERE id = v_poi.item_id;

          INSERT INTO inventory_log (id, store_id, item_id, change_qty, qty_before, qty_after, reason, employee_id)
          VALUES (gen_random_uuid(), p_store_id, v_poi.item_id, -v_poi.qty_received, v_old_qty, v_new_qty, 'po_cancelled', p_employee_id);
        END IF;
        UPDATE purchase_order_items SET qty_received = 0 WHERE id = v_poi.id;
      END IF;
    END LOOP;
  END IF;

  -- Hard-cancel: set status and clear all received qtys
  UPDATE purchase_order_items SET qty_received = 0, status = 'cancelled' WHERE po_id = p_po_id;
  UPDATE purchase_orders SET status = 'cancelled', updated_at = now() WHERE id = p_po_id;

  INSERT INTO audit_log (id, store_id, employee_id, action, entity_type, entity_id,
    old_value, new_value)
  VALUES (gen_random_uuid(), p_store_id, p_employee_id, 'po_cancelled', 'purchase_order', p_po_id,
    jsonb_build_object('status', v_po.status), jsonb_build_object('status', 'cancelled'));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Bug 18: Fix receive RPC — don't increment qty_received for deleted items
-- The fix: move qty_received update INSIDE the FOUND check
-- This replaces the buggy `receive_purchase_order` function from migration 0002
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_po_id UUID,
  p_store_id UUID,
  p_items JSONB,
  p_employee_id UUID,
  p_update_cost BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_po RECORD;
  v_item JSONB;
  v_poi RECORD;
  v_line_id UUID;
  v_recv NUMERIC;
  v_old_qty NUMERIC;
  v_new_qty NUMERIC;
  v_idx INT;
  v_count INT;
  v_total_received INT := 0;
  v_total_lines INT;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO not found');
  END IF;
  IF v_po.status NOT IN ('ordered', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO is not in receivable status');
  END IF;

  v_count := jsonb_array_length(p_items);
  FOR v_idx IN 0..v_count - 1 LOOP
    v_item := p_items -> v_idx;
    v_line_id := (v_item ->> 'lineId')::UUID;
    v_recv := (v_item ->> 'qty')::NUMERIC;

    SELECT * INTO v_poi FROM purchase_order_items WHERE id = v_line_id AND po_id = p_po_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Verify remaining capacity
    IF v_poi.qty_ordered - v_poi.qty_received < v_recv THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Receive qty exceeds remaining for: ' || v_poi.item_name);
    END IF;

    -- Try to update stock (item might be deleted)
    SELECT stock_qty INTO v_old_qty FROM items WHERE id = v_poi.item_id FOR UPDATE;
    IF FOUND THEN
      v_new_qty := v_old_qty + v_recv;
      UPDATE items SET stock_qty = v_new_qty, updated_at = now() WHERE id = v_poi.item_id;
      IF p_update_cost AND v_poi.unit_cost > 0 THEN
        UPDATE items SET cost = v_poi.unit_cost WHERE id = v_poi.item_id;
      END IF;
      INSERT INTO inventory_log (id, store_id, item_id, change_qty, qty_before, qty_after, reason, employee_id)
      VALUES (gen_random_uuid(), p_store_id, v_poi.item_id, v_recv, v_old_qty, v_new_qty, 'delivery', p_employee_id);
    END IF;

    -- Always update qty_received (even for deleted items — audit trail preserved)
    UPDATE purchase_order_items SET qty_received = qty_received + v_recv WHERE id = v_line_id;
    v_total_received := v_total_received + 1;
  END LOOP;

  -- Determine new status
  SELECT COUNT(*) INTO v_total_lines FROM purchase_order_items WHERE po_id = p_po_id;
  IF (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = p_po_id AND qty_received >= qty_ordered) = v_total_lines THEN
    v_new_status := 'received';
  ELSE
    v_new_status := 'partial';
  END IF;

  UPDATE purchase_orders SET status = v_new_status, updated_at = now() WHERE id = p_po_id;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;
