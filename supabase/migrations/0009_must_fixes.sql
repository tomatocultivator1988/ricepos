-- RicePOS — Must-fix schema changes
-- Run in Supabase SQL Editor after 0008_collection_atomic.sql

ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change NUMERIC(12,2) DEFAULT 0;
ALTER TABLE discounts ALTER COLUMN value TYPE NUMERIC(12,2);
