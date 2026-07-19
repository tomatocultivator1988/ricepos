-- RicePOS — Atomic collection payment
-- Run in Supabase SQL Editor after 0007_expenses_category_text.sql
-- Replaces the advisory-lock approach — runs entire collection in one transaction with FOR UPDATE

CREATE OR REPLACE FUNCTION process_collection(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_store_id UUID,
  p_employee_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale RECORD;
  v_remaining NUMERIC;
  v_alloc NUMERIC;
  v_new_amount_paid NUMERIC;
  v_new_balance NUMERIC;
  v_new_status TEXT;
  v_col_num INTEGER;
  v_receipt_no TEXT;
  v_total_outstanding NUMERIC;
  v_allocations JSONB := '[]'::JSONB;
  v_year INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());
  v_remaining := p_amount;

  FOR v_sale IN
    SELECT id, total, amount_paid, balance
    FROM sales
    WHERE customer_id = p_customer_id
      AND status IN ('unpaid', 'partial')
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining <= 0 THEN EXIT; END IF;
    IF v_sale.balance <= 0 THEN CONTINUE; END IF;

    v_alloc := LEAST(v_remaining, v_sale.balance);
    v_remaining := v_remaining - v_alloc;

    v_new_amount_paid := v_sale.amount_paid + v_alloc;
    v_new_balance := v_sale.total - v_new_amount_paid;

    IF v_new_balance <= 0.01 THEN
      v_new_status := 'paid';
    ELSE
      v_new_status := 'partial';
    END IF;

    UPDATE sales
    SET amount_paid = v_new_amount_paid,
        balance = v_new_balance,
        status = v_new_status::sale_status
    WHERE id = v_sale.id;

    SELECT COALESCE(MAX(last_number), 0) + 1 INTO v_col_num
    FROM sale_sequences
    WHERE store_id = p_store_id AND year = v_year;

    IF v_col_num = 1 THEN
      INSERT INTO sale_sequences (store_id, year, last_number)
      VALUES (p_store_id, v_year, 1);
    ELSE
      UPDATE sale_sequences SET last_number = v_col_num
      WHERE store_id = p_store_id AND year = v_year;
    END IF;

    v_receipt_no := 'COL-' || LPAD(v_col_num::TEXT, 6, '0');

    INSERT INTO payments (id, sale_id, method, amount, is_collection, receipt_no, created_by)
    VALUES (gen_random_uuid(), v_sale.id, p_method::payment_method, v_alloc, true, v_receipt_no, p_employee_id);

    INSERT INTO journal (id, store_id, event_type, sale_id, employee_id, details)
    VALUES (gen_random_uuid(), p_store_id, 'collection_recorded', v_sale.id, p_employee_id,
            jsonb_build_object('amount', v_alloc, 'method', p_method, 'receipt_no', v_receipt_no));

    v_allocations := v_allocations || jsonb_build_object(
      'saleId', v_sale.id,
      'allocated', v_alloc,
      'newStatus', v_new_status
    );
  END LOOP;

  IF jsonb_array_length(v_allocations) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No outstanding balance found');
  END IF;

  SELECT COALESCE(SUM(balance), 0) INTO v_total_outstanding
  FROM sales
  WHERE customer_id = p_customer_id
    AND status IN ('unpaid', 'partial');

  RETURN jsonb_build_object(
    'success', true,
    'totalAllocated', p_amount - v_remaining,
    'remaining', v_remaining,
    'newBalance', v_total_outstanding,
    'allocations', v_allocations
  );
END;
$$;
