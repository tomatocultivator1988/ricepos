-- RicePOS — Initial Database Schema
-- Run this in the Supabase SQL Editor against a fresh project.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE sell_by AS ENUM ('weight', 'unit');

CREATE TYPE customer_type AS ENUM ('retail', 'wholesale');
CREATE TYPE customer_status AS ENUM ('active', 'inactive');

CREATE TYPE item_status AS ENUM ('active', 'inactive');

CREATE TYPE sale_status AS ENUM ('completed', 'unpaid', 'partial', 'paid', 'voided', 'refunded');
CREATE TYPE sale_item_status AS ENUM ('completed', 'voided', 'returned', 'refunded');

CREATE TYPE payment_method AS ENUM ('cash', 'gcash');
CREATE TYPE discount_type AS ENUM ('senior', 'pwd', 'custom_pct', 'custom_fixed');

CREATE TYPE expense_category AS ENUM ('utilities', 'rent', 'supplies', 'salary', 'load', 'transport', 'other');

CREATE TYPE inventory_reason AS ENUM ('sale', 'delivery', 'adjustment', 'void', 'refund');

-- ============================================================
-- STORE
-- ============================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Store',
  tin TEXT,
  address TEXT,
  contact TEXT,
  currency TEXT DEFAULT 'PHP',
  currency_symbol TEXT DEFAULT '₱',
  timezone TEXT DEFAULT 'Asia/Manila',
  receipt_header TEXT,
  receipt_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EMPLOYEES (users)
-- ============================================================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  pin_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TAX RATES
-- ============================================================

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DISCOUNTS
-- ============================================================

CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type discount_type NOT NULL,
  value NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ITEMS (products)
-- ============================================================

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sell_by sell_by NOT NULL DEFAULT 'unit',
  cost NUMERIC(12,2) DEFAULT 0,
  barcode TEXT UNIQUE,
  stock_qty NUMERIC(12,3) DEFAULT 0,
  min_stock NUMERIC(12,3) DEFAULT 0,
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
  discount_eligible BOOLEAN DEFAULT true,
  status item_status DEFAULT 'active',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SELLING UNITS
-- ============================================================

CREATE TABLE selling_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_qty NUMERIC(12,3) NOT NULL CHECK (base_qty > 0),
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_qty NUMERIC(12,3) DEFAULT 0.001,
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  type customer_type DEFAULT 'retail',
  status customer_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  sale_number INT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type discount_type,
  discount_value NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_total NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  status sale_status NOT NULL DEFAULT 'completed',
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sale number sequence per store per year
CREATE TABLE sale_sequences (
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_number INT DEFAULT 0,
  PRIMARY KEY (store_id, year)
);

-- ============================================================
-- SALE ITEMS
-- ============================================================

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  selling_unit_id UUID REFERENCES selling_units(id) ON DELETE SET NULL,
  selling_unit_name TEXT NOT NULL,
  base_qty_snapshot NUMERIC(12,3) NOT NULL,
  qty NUMERIC(12,3) NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  cost_at_sale NUMERIC(12,2),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  deducted_qty NUMERIC(12,3) NOT NULL,
  status sale_item_status DEFAULT 'completed',
  void_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  is_collection BOOLEAN DEFAULT false,
  receipt_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category expense_category NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INVENTORY LOG
-- ============================================================

CREATE TABLE inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  change_qty NUMERIC(12,3) NOT NULL,
  qty_before NUMERIC(12,3) NOT NULL,
  qty_after NUMERIC(12,3) NOT NULL,
  reason inventory_reason NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  note TEXT,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CASH COUNTS
-- ============================================================

CREATE TABLE cash_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  system_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- POS CARTS
-- ============================================================

CREATE TABLE pos_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL, -- NB: stores store_id, not shift_id; the shift system was removed
  cart_data JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- JOURNAL (electronic)
-- ============================================================

CREATE TABLE journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SETTINGS
-- ============================================================

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, key)
);

-- ============================================================
-- TIME LOGS (employee login/logout tracking)
-- ============================================================

CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ DEFAULT now(),
  logout_at TIMESTAMPTZ,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_items_store ON items(store_id);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_selling_units_item ON selling_units(item_id);
CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_employee ON sales(employee_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_expenses_store ON expenses(store_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_inventory_log_item ON inventory_log(item_id);
CREATE INDEX idx_inventory_log_date ON inventory_log(created_at);
CREATE INDEX idx_cash_counts_store ON cash_counts(store_id);
CREATE INDEX idx_cash_counts_date ON cash_counts(date);
CREATE INDEX idx_audit_log_store ON audit_log(store_id);
CREATE INDEX idx_journal_store ON journal(store_id);
CREATE INDEX idx_settings_store ON settings(store_id);

-- ============================================================
-- AUTO-UPDATE TRIGGER for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN (
      'stores', 'employees', 'categories', 'tax_rates', 'discounts',
      'items', 'selling_units', 'customers', 'sales', 'settings'
    )
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_timestamp()',
      t, t
    );
  END LOOP;
END;
$$;
