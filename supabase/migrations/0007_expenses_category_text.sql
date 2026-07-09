-- RicePOS — Change expenses.category from enum to text
-- So that dynamic categories from expense_categories table can be used.
-- Run this AFTER 0006_expense_categories.sql

ALTER TABLE expenses ALTER COLUMN category TYPE text;
