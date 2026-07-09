-- RicePOS — Expense Categories Table
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_store ON expense_categories(store_id);

INSERT INTO expense_categories (id, store_id, name)
  SELECT gen_random_uuid(), id, 'utilities' FROM stores
  UNION ALL
  SELECT gen_random_uuid(), id, 'rent' FROM stores
  UNION ALL
  SELECT gen_random_uuid(), id, 'supplies' FROM stores
  UNION ALL
  SELECT gen_random_uuid(), id, 'salary' FROM stores
  UNION ALL
  SELECT gen_random_uuid(), id, 'load' FROM stores
  UNION ALL
  SELECT gen_random_uuid(), id, 'transport' FROM stores
  UNION ALL
  SELECT gen_random_uuid(), id, 'other' FROM stores;
