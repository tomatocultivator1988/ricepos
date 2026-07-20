-- RicePOS — Update receive_purchase_order to support consignment items
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_po_id UUID,
  p_store_id UUID,
  p_items JSONB,
  p_employee_id UUID,
  p_update_cost BOOLEAN DEFAULT false,
  p_is_consignment BOOLEAN DEFAULT false,
  p_consignment_agreed_price NUMERIC DEFAULT NULL
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
  v_total_lines INT;
  v_new_status TEXT;
  v_is_consignment BOOLEAN;
  v_supplier_id UUID;
  v_agreed_price NUMERIC;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO not found');
  END IF;
  IF v_po.status NOT IN ('ordered', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO is not in receivable status');
  END IF;

  v_supplier_id := v_po.supplier_id;

  v_count := jsonb_array_length(p_items);
  FOR v_idx IN 0..v_count - 1 LOOP
    v_item := p_items -> v_idx;
    v_line_id := (v_item ->> 'line_id')::UUID;
    v_recv := (v_item ->> 'receive_qty')::NUMERIC;
    v_is_consignment := COALESCE((v_item ->> 'is_consignment')::BOOLEAN, p_is_consignment);
    v_agreed_price := COALESCE((v_item ->> 'consignment_agreed_price')::NUMERIC, p_consignment_agreed_price);

    SELECT * INTO v_poi FROM purchase_order_items WHERE id = v_line_id AND po_id = p_po_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    IF v_poi.qty_ordered - v_poi.qty_received < v_recv THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Receive qty exceeds remaining for: ' || v_poi.item_name);
    END IF;

    SELECT stock_qty INTO v_old_qty FROM items WHERE id = v_poi.item_id FOR UPDATE;
    IF FOUND THEN
      v_new_qty := v_old_qty + v_recv;
      UPDATE items SET stock_qty = v_new_qty, updated_at = now() WHERE id = v_poi.item_id;

      -- Apply cost update
      IF COALESCE((v_item ->> 'update_cost')::BOOLEAN, p_update_cost) AND v_poi.unit_cost > 0 THEN
        UPDATE items SET cost = v_poi.unit_cost WHERE id = v_poi.item_id;
      END IF;

      -- Mark as consignment if applicable
      IF v_is_consignment THEN
        UPDATE items SET
          is_consignment = true,
          consignment_supplier_id = v_supplier_id,
          consignment_agreed_price = COALESCE(v_agreed_price, v_poi.unit_cost),
          updated_at = now()
        WHERE id = v_poi.item_id;
      END IF;

      INSERT INTO inventory_log (id, store_id, item_id, change_qty, qty_before, qty_after, reason, employee_id)
      VALUES (gen_random_uuid(), p_store_id, v_poi.item_id, v_recv, v_old_qty, v_new_qty, 'delivery', p_employee_id);
    END IF;

    UPDATE purchase_order_items SET qty_received = qty_received + v_recv WHERE id = v_line_id;
  END LOOP;

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
