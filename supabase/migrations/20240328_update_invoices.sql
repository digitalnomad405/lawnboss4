-- Update invoices table structure
ALTER TABLE invoices
    -- Rename amount to total
    ALTER COLUMN amount TYPE DECIMAL(10,2),
    ALTER COLUMN amount SET NOT NULL,
    ALTER COLUMN amount SET DEFAULT 0,
    RENAME COLUMN amount TO total;

-- Add missing columns
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id),
    ADD COLUMN IF NOT EXISTS service_schedule_id UUID REFERENCES service_schedules(id),
    ADD COLUMN IF NOT EXISTS payment_terms INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN NOT NULL DEFAULT false;

-- Add constraints
ALTER TABLE invoices
    ADD CONSTRAINT invoices_subtotal_positive CHECK (subtotal >= 0),
    ADD CONSTRAINT invoices_tax_amount_positive CHECK (tax_amount >= 0),
    ADD CONSTRAINT invoices_amount_paid_positive CHECK (amount_paid >= 0),
    ADD CONSTRAINT invoices_balance_positive CHECK (balance >= 0),
    ADD CONSTRAINT invoices_payment_terms_positive CHECK (payment_terms > 0);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_service_schedule_id ON invoices(service_schedule_id);

-- Update balance trigger
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance when total or amount_paid changes
    NEW.balance = NEW.total - NEW.amount_paid;
    
    -- Automatically set status to paid when fully paid
    IF NEW.balance <= 0 AND NEW.status != 'cancelled' THEN
        NEW.status = 'paid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance updates
DROP TRIGGER IF EXISTS update_invoice_balance_trigger ON invoices;
CREATE TRIGGER update_invoice_balance_trigger
    BEFORE INSERT OR UPDATE OF total, amount_paid ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance(); 