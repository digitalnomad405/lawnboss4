-- Update invoice_items table structure
ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(10,4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price * tax_rate) STORED,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price * (1 + tax_rate)) STORED;

-- Add constraints
ALTER TABLE invoice_items
    ADD CONSTRAINT invoice_items_quantity_positive CHECK (quantity > 0),
    ADD CONSTRAINT invoice_items_unit_price_positive CHECK (unit_price >= 0),
    ADD CONSTRAINT invoice_items_tax_rate_range CHECK (tax_rate >= 0 AND tax_rate <= 1);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_schedule_id ON invoice_items(service_schedule_id); 