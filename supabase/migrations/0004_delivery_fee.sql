-- RicePOS — Delivery Fee
-- Run in Supabase SQL Editor.

ALTER TABLE sales ADD COLUMN delivery_fee NUMERIC(12,2) DEFAULT 0;
