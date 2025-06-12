-- Create invoice_status enum
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Create payment_method enum
CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'cash', 'check');

-- Create invoices table
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    payment_date DATE,
    payment_method payment_method,
    notes TEXT,
    
    CONSTRAINT invoice_amount_positive CHECK (amount >= 0)
);

-- Create invoice_items table (renamed from invoice_services for clarity)
CREATE TABLE invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_schedule_id UUID NOT NULL REFERENCES service_schedules(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    
    CONSTRAINT invoice_item_amount_positive CHECK (amount >= 0),
    CONSTRAINT invoice_item_unique UNIQUE (invoice_id, service_schedule_id)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for invoices
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for invoice_items
CREATE TRIGGER update_invoice_items_updated_at
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_service_schedule_id ON invoice_items(service_schedule_id);

-- Create RLS policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users"
    ON invoices FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read access for authenticated users"
    ON invoice_items FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert access for authenticated users"
    ON invoices FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON invoice_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow update access to authenticated users
CREATE POLICY "Allow update access for authenticated users"
    ON invoices FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON invoice_items FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow delete access to authenticated users
CREATE POLICY "Allow delete access for authenticated users"
    ON invoices FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Allow delete access for authenticated users"
    ON invoice_items FOR DELETE
    TO authenticated
    USING (true); 