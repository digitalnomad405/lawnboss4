-- Insert additional service types
INSERT INTO public.service_types (label, name, description, base_price, unit_type, tax_rate)
VALUES 
    -- Existing services
    ('Basic Lawn Maintenance', 'Basic Lawn Maintenance', 'Mowing, edging, and cleanup', 65.00, 'flat_rate', 0.00),
    ('Full Service Package', 'Full Service Package', 'Mowing, edging, cleanup, fertilization, and weed control', 120.00, 'flat_rate', 0.00),
    
    -- Additional services
    ('Mulch Installation', 'Mulch Installation', 'Premium mulch installation service', 55.00, 'per_yard', 0.00),
    ('Pine Straw Installation', 'Pine Straw Installation', 'Pine straw installation by the bale', 12.00, 'per_yard', 0.00),
    ('Weed Control', 'Weed Control', 'Targeted weed control application', 75.00, 'flat_rate', 0.00),
    ('Fertilization', 'Fertilization', 'Professional lawn fertilization service', 85.00, 'flat_rate', 0.00),
    ('Pressure Washing', 'Pressure Washing', 'High-pressure cleaning of surfaces', 95.00, 'flat_rate', 0.00),
    ('Bush Trimming', 'Bush Trimming', 'Professional shrub and bush trimming', 45.00, 'flat_rate', 0.00),
    ('Leaf Removal', 'Leaf Removal', 'Complete leaf cleanup and removal', 85.00, 'flat_rate', 0.00)
ON CONFLICT (label) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    unit_type = EXCLUDED.unit_type,
    tax_rate = EXCLUDED.tax_rate,
    updated_at = CURRENT_TIMESTAMP; 