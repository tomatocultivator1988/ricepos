-- RicePOS — Atomic void/refund with payment reversal (fixes bugs 4,5,6)
CREATE OR REPLACE FUNCTION process_void_or_refund(
  p_store_id UUID,
  p_employee_id UUID,
  p_sale_id UUID,
  p_action TEXT,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_old_qty NUMERIC;
  v_new_qty NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Lock sale row
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
  END IF;
  IF v_sale.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot ' || p_action || ' a sale with status ''' || v_sale.status || '''');
  END IF;

  -- Lock and restock items
  FOR v_item IN SELECT si.* FROM sale_items si WHERE si.sale_id = p_sale_id AND si.status = 'completed'
  LOOP
    -- Lock item row
    SELECT stock_qty INTO v_old_qty FROM items WHERE id = v_item.item_id FOR UPDATE;
    IF FOUND THEN
      v_new_qty := v_old_qty + COALESCE(v_item.deducted_qty, 0);

      UPDATE items SET stock_qty = v_new_qty, updated_at = now() WHERE id = v_item.item_id;

      INSERT INTO inventory_log (id, store_id, item_id, change_qty, qty_before, qty_after, reason, sale_id, employee_id)
      VALUES (gen_random_uuid(), p_store_id, v_item.item_id, COALESCE(v_item.deducted_qty, 0),
              v_old_qty, v_new_qty, p_action, p_sale_id, p_employee_id);
    END IF;

    UPDATE sale_items SET status = CASE WHEN p_action = 'void' THEN 'voided'::sale_item_status ELSE 'refunded'::sale_item_status END,
      void_reason = p_reason
    WHERE id = v_item.id;
  END LOOP;

  -- Update sale status
  v_new_status := CASE WHEN p_action = 'void' THEN 'voided' ELSE 'refunded' END;
  UPDATE sales SET status = v_new_status::sale_status, void_reason = p_reason,
    voided_at = now(), voided_by = p_employee_id, updated_at = now()
  WHERE id = p_sale_id;

  -- Reverse payments
  DELETE FROM payments WHERE sale_id = p_sale_id;

  -- Audit log
  INSERT INTO audit_log (id, store_id, employee_id, action, entity_type, entity_id, old_value, new_value, reason)
  VALUES (gen_random_uuid(), p_store_id, p_employee_id, 'sale_' || p_action || 'ed', 'sale', p_sale_id,
    jsonb_build_object('status', 'completed', 'sale_number', v_sale.sale_number),
    jsonb_build_object('status', v_new_status), p_reason);

  -- Journal
  INSERT INTO journal (id, store_id, event_type, sale_id, employee_id, details)
  VALUES (gen_random_uuid(), p_store_id, 'sale_' || p_action || 'ed', p_sale_id, p_employee_id,
    jsonb_build_object('sale_number', v_sale.sale_number, 'previous_status', 'completed',
      'new_status', v_new_status, 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'sale', jsonb_build_object('id', p_sale_id, 'status', v_new_status));
END;
$$;
