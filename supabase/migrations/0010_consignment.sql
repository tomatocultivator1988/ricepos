ALTER TABLE items ADD COLUMN IF NOT EXISTS is_consignment BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS consignment_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS consignment_agreed_price NUMERIC(12,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS consignment_last_settled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS consignment_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    qty_sold NUMERIC(12,3) NOT NULL CHECK (qty_sold > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
