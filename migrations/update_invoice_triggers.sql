-- First, save the view definitions
DO $$ 
BEGIN
    -- Create a temporary table to store the view definitions
    CREATE TEMP TABLE temp_view_defs AS
    SELECT viewname, definition 
    FROM pg_views 
    WHERE viewname IN ('invoice_summaries', 'property_service_history');
END $$;

-- Drop the views in reverse dependency order
DROP VIEW IF EXISTS property_service_history;
DROP VIEW IF EXISTS invoice_summaries;

-- Create the enum type
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled');

-- Then, update existing data to ensure all status values are valid
UPDATE invoices 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled');

-- Now alter the column type
ALTER TABLE invoices 
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE invoice_status USING status::invoice_status,
    ALTER COLUMN status SET DEFAULT 'pending'::invoice_status;

-- Recreate invoice_summaries view with proper type casting
CREATE VIEW invoice_summaries AS
SELECT 
    c.id AS customer_id,
    (c.first_name || ' ' || c.last_name) AS customer_name,
    count(i.id) AS total_invoices,
    count(i.id) FILTER (WHERE i.status = 'pending'::invoice_status) AS pending_invoices,
    sum(i.total) AS total_billed,
    sum(i.amount_paid) AS total_paid,
    sum(i.balance) AS total_outstanding,
    max(i.due_date) AS next_due_date
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
GROUP BY c.id, c.first_name, c.last_name;

-- Recreate property_service_history view (we'll need the actual definition)
DO $$
BEGIN
    EXECUTE (
        SELECT 'CREATE VIEW property_service_history AS ' || 
        regexp_replace(definition, 
                      '= ''[^'']*''::text', 
                      '= \1::invoice_status', 
                      'g')
        FROM temp_view_defs 
        WHERE viewname = 'property_service_history'
    );
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check and update overdue status
CREATE OR REPLACE FUNCTION check_invoice_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update status to overdue if it's not already paid or cancelled
    IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
        NEW.status = 'overdue'::invoice_status;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to recalculate balance
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance when amount_paid changes
    NEW.balance = NEW.total - NEW.amount_paid;
    
    -- Automatically set status to paid when fully paid
    IF NEW.balance <= 0 AND NEW.status != 'cancelled'::invoice_status THEN
        NEW.status = 'paid'::invoice_status;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_invoice_overdue
    BEFORE INSERT OR UPDATE OF due_date, status ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_invoice_overdue_status();

CREATE TRIGGER update_invoice_balance_trigger
    BEFORE INSERT OR UPDATE OF total, amount_paid ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance();

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Add constraint to ensure amount_paid cannot exceed total
ALTER TABLE invoices
ADD CONSTRAINT check_amount_paid_not_exceed_total
CHECK (amount_paid <= total); 