-- RicePOS — Return to Supplier (returns against received Purchase Orders)
-- Run in Supabase SQL Editor.

-- ============================================================
-- ENUM: new inventory reason
-- (ALTER TYPE ... ADD VALUE must be committed before it is used;
--  it is only referenced at runtime inside the function below.)
-- ============================================================
ALTER TYPE inventory_reason ADD VALUE IF NOT EXISTS 'return_to_supplier';

-- ============================================================
-- RETURN RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_por_store ON purchase_order_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_por_po ON purchase_order_returns(po_id);

-- ============================================================
-- RETURN LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES purchase_order_returns(id) ON DELETE CASCADE,
  poi_id UUID REFERENCES purchase_order_items(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  qty_returned NUMERIC(12,3) NOT NULL CHECK (qty_returned > 0),
  unit_cost NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pori_return ON purchase_order_return_items(return_id);

-- ============================================================
-- ATOMIC RETURN FUNCTION
-- _lines = jsonb array: [{ "poi_id": uuid, "qty_returned": num }]
-- Runs entirely inside one transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION return_purchase_order_items(
  _po_id UUID,
  _store_id UUID,
  _employee_id UUID,
  _reason TEXT,
  _lines JSONB
) RETURNS purchase_order_returns
LANGUAGE plpgsql
AS $$
DECLARE
  v_ret_id UUID := gen_random_uuid();
  v_ret_number TEXT;
  v_line JSONB;
  v_poi purchase_order_items;
  v_item items;
  v_old_stock NUMERIC(12,3);
  v_new_stock NUMERIC(12,3);
  v_total NUMERIC(12,2) := 0;
  v_line_total NUMERIC(12,2);
  v_return_qty NUMERIC(12,3);
  v_next_num INT;
  v_po purchase_orders;
  v_ret purchase_order_returns;
  v_all_done BOOLEAN;
  v_any_done BOOLEAN;
BEGIN
  -- Lock + validate PO
  SELECT * INTO v_po FROM purchase_orders
    WHERE id = _po_id AND store_id = _store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PO not found'; END IF;
  IF v_po.status NOT IN ('received','partial') THEN
    RAISE EXCEPTION 'Only received or partial POs can be returned (status=%)', v_po.status;
  END IF;

  -- Atomically get next return number (shares per-store/year sequence)
  INSERT INTO po_sequences (store_id, year, last_number)
    VALUES (_store_id, EXTRACT(YEAR FROM NOW())::INT, 1)
  ON CONFLICT (store_id, year)
    DO UPDATE SET last_number = po_sequences.last_number + 1
  RETURNING last_number INTO v_next_num;

  v_ret_number := 'RET-' || LPAD(v_next_num::TEXT, 6, '0');

  -- Insert return header (total filled in after lines)
  INSERT INTO purchase_order_returns (id, store_id, po_id, return_number, reason, status, created_by, total_cost)
    VALUES (v_ret_id, _store_id, _po_id, v_ret_number, _reason, 'completed', _employee_id, 0);

  -- Process each line
  FOR v_line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    v_return_qty := (v_line->>'qty_returned')::NUMERIC(12,3);
    IF v_return_qty IS NULL OR v_return_qty <= 0 THEN CONTINUE; END IF;

    -- Lock + validate PO line
    SELECT * INTO v_poi FROM purchase_order_items
      WHERE id = (v_line->>'poi_id')::UUID AND po_id = _po_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PO line not found'; END IF;

    IF v_return_qty > v_poi.qty_received THEN
      RAISE EXCEPTION 'Return quantity (%) exceeds received quantity (%)', v_return_qty, v_poi.qty_received;
    END IF;

    -- Lock item + check stock (cannot return what was already sold)
    SELECT * INTO v_item FROM items WHERE id = v_poi.item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item no longer exists for this line'; END IF;

    v_old_stock := v_item.stock_qty;
    IF v_return_qty > v_old_stock THEN
      RAISE EXCEPTION 'Cannot return % of "%": only % in stock (may have been sold)', v_return_qty, v_item.name, v_old_stock;
    END IF;

    v_new_stock := v_old_stock - v_return_qty;
    v_line_total := v_return_qty * v_poi.unit_cost;
    v_total := v_total + v_line_total;

    -- Deduct stock
    UPDATE items SET stock_qty = v_new_stock, updated_at = NOW() WHERE id = v_item.id;

    -- Log inventory movement
    INSERT INTO inventory_log (store_id, item_id, change_qty, qty_before, qty_after, reason, employee_id, note)
      VALUES (_store_id, v_poi.item_id, -v_return_qty, v_old_stock, v_new_stock, 'return_to_supplier', _employee_id, 'Return ' || v_ret_number);

    -- Reduce PO line received qty
    UPDATE purchase_order_items SET qty_received = qty_received - v_return_qty WHERE id = v_poi.id;

    -- Insert return line
    INSERT INTO purchase_order_return_items (return_id, poi_id, item_id, item_name, qty_returned, unit_cost, line_total)
      VALUES (v_ret_id, v_poi.id, v_poi.item_id, v_item.name, v_return_qty, v_poi.unit_cost, v_line_total);
  END LOOP;

  IF v_total = 0 THEN RAISE EXCEPTION 'Nothing to return'; END IF;

  -- Persist return total
  UPDATE purchase_order_returns SET total_cost = v_total WHERE id = v_ret_id;

  -- Recompute PO status after returns
  SELECT bool_and(qty_received >= qty_ordered), bool_or(qty_received > 0)
    INTO v_all_done, v_any_done
    FROM purchase_order_items WHERE po_id = _po_id;

  UPDATE purchase_orders
    SET status = CASE WHEN v_all_done THEN 'received' WHEN v_any_done THEN 'partial' ELSE 'ordered' END,
        updated_at = NOW()
    WHERE id = _po_id;

  SELECT * INTO v_ret FROM purchase_order_returns WHERE id = v_ret_id;
  RETURN v_ret;
END;
$$;
