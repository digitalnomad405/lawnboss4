-- Create estimate_status enum
CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired', 'opportunity_won', 'opportunity_lost');

-- Create estimates table
CREATE TABLE estimates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid,
    property_id uuid,
    title text,
    description text,
    valid_until date,
    notes text,
    subtotal numeric NOT NULL DEFAULT 0,
    tax_amount numeric NOT NULL DEFAULT 0,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    total_amount numeric DEFAULT 0,
    CONSTRAINT estimates_pkey PRIMARY KEY (id),
    CONSTRAINT estimates_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT estimates_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Create estimate_items table
CREATE TABLE estimate_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    estimate_id uuid,
    service_type_id uuid,
    description text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL DEFAULT 0,
    tax_rate numeric NOT NULL DEFAULT 0,
    tax_amount numeric NOT NULL DEFAULT 0,
    subtotal numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    total numeric DEFAULT 0,
    CONSTRAINT estimate_items_pkey PRIMARY KEY (id),
    CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES estimates(id),
    CONSTRAINT estimate_items_service_type_id_fkey FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimate_items_updated_at
    BEFORE UPDATE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_property_id ON estimates(property_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_service_type_id ON estimate_items(service_type_id);

-- Create RLS policies
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users"
    ON estimates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read access for authenticated users"
    ON estimate_items FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert access for authenticated users"
    ON estimates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON estimate_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow update access to authenticated users
CREATE POLICY "Allow update access for authenticated users"
    ON estimates FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON estimate_items FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow delete access to authenticated users
CREATE POLICY "Allow delete access for authenticated users"
    ON estimates FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Allow delete access for authenticated users"
    ON estimate_items FOR DELETE
    TO authenticated
    USING (true); 