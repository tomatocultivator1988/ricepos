-- RicePOS — Shifts (cash management with denomination counting)

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  opening_denoms JSONB DEFAULT '{}'::JSONB,
  closed_at TIMESTAMPTZ,
  closing_cash NUMERIC(12,2),
  closing_denoms JSONB,
  cash_sales NUMERIC(12,2) DEFAULT 0,
  cash_collections NUMERIC(12,2) DEFAULT 0,
  expected_cash NUMERIC(12,2),
  variance NUMERIC(12,2),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_store ON shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);
