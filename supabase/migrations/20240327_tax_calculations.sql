-- Add tax configuration table
CREATE TABLE tax_configurations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    rate numeric NOT NULL DEFAULT 0 CHECK (rate >= 0 AND rate <= 1),
    is_default boolean DEFAULT false,
    applies_to text[] DEFAULT '{}' CHECK (applies_to <@ ARRAY['service', 'product', 'material']),
    location_rules jsonb DEFAULT '{}'::jsonb,
    exemption_rules jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tax_configurations_pkey PRIMARY KEY (id),
    CONSTRAINT tax_configurations_rate_range CHECK (rate >= 0 AND rate <= 1)
);

-- Create function to calculate tax
CREATE OR REPLACE FUNCTION calculate_tax(
    p_base_amount numeric,
    p_tax_rate numeric DEFAULT NULL,
    p_tax_config_id uuid DEFAULT NULL,
    p_item_type text DEFAULT 'service',
    p_location jsonb DEFAULT NULL,
    p_customer_id uuid DEFAULT NULL
)
RETURNS TABLE (
    tax_rate numeric,
    tax_amount numeric,
    total_amount numeric
) AS $$
DECLARE
    v_tax_rate numeric;
    v_tax_amount numeric;
    v_total_amount numeric;
    v_tax_config tax_configurations%ROWTYPE;
BEGIN
    -- If specific tax rate is provided, use it
    IF p_tax_rate IS NOT NULL THEN
        v_tax_rate := p_tax_rate;
    -- If tax config ID is provided, use its rate
    ELSIF p_tax_config_id IS NOT NULL THEN
        SELECT * INTO v_tax_config
        FROM tax_configurations
        WHERE id = p_tax_config_id;
        
        IF FOUND THEN
            v_tax_rate := v_tax_config.rate;
        END IF;
    -- Otherwise use default tax configuration
    ELSE
        SELECT * INTO v_tax_config
        FROM tax_configurations
        WHERE is_default = true
        LIMIT 1;
        
        IF FOUND THEN
            v_tax_rate := v_tax_config.rate;
        ELSE
            v_tax_rate := 0;
        END IF;
    END IF;

    -- Calculate tax amount
    v_tax_amount := ROUND(p_base_amount * v_tax_rate, 2);
    v_total_amount := p_base_amount + v_tax_amount;

    RETURN QUERY
    SELECT v_tax_rate, v_tax_amount, v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- Create function to update estimate item tax
CREATE OR REPLACE FUNCTION update_estimate_item_tax()
RETURNS trigger AS $$
BEGIN
    SELECT
        tax_rate,
        tax_amount,
        total_amount
    INTO
        NEW.tax_rate,
        NEW.tax_amount,
        NEW.total
    FROM calculate_tax(
        NEW.subtotal,
        NEW.tax_rate
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update invoice item tax
CREATE OR REPLACE FUNCTION update_invoice_item_tax()
RETURNS trigger AS $$
BEGIN
    SELECT
        tax_rate,
        tax_amount,
        total_amount
    INTO
        NEW.tax_rate,
        NEW.tax_amount,
        NEW.total
    FROM calculate_tax(
        NEW.amount,
        NEW.tax_rate
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tax calculation
CREATE TRIGGER calculate_estimate_item_tax
    BEFORE INSERT OR UPDATE OF quantity, unit_price, tax_rate ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_item_tax();

CREATE TRIGGER calculate_invoice_item_tax
    BEFORE INSERT OR UPDATE OF amount, tax_rate ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_item_tax();

-- Add indexes
CREATE INDEX idx_tax_configurations_is_default ON tax_configurations(is_default);

-- Enable RLS
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to authenticated users"
    ON tax_configurations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin only"
    ON tax_configurations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow update to admin only"
    ON tax_configurations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Insert default tax configuration
INSERT INTO tax_configurations (
    name,
    description,
    rate,
    is_default,
    applies_to
) VALUES (
    'Default Sales Tax',
    'Standard sales tax rate for services and products',
    0.07,  -- 7% tax rate
    true,
    ARRAY['service', 'product', 'material']
);

-- Add comments
COMMENT ON TABLE tax_configurations IS 'Stores tax rates and rules';
COMMENT ON COLUMN tax_configurations.rate IS 'Tax rate as a decimal (e.g., 0.07 for 7%)';
COMMENT ON COLUMN tax_configurations.applies_to IS 'Types of items this tax applies to';
COMMENT ON COLUMN tax_configurations.location_rules IS 'JSON rules for location-based tax application';
COMMENT ON COLUMN tax_configurations.exemption_rules IS 'JSON rules for tax exemptions'; 