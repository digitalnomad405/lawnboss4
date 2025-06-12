-- Insert test technicians
INSERT INTO public.technicians (first_name, last_name, email, phone, status)
SELECT
  first_name,
  last_name,
  email,
  phone,
  status
FROM (
  VALUES
    ('John', 'Smith', 'john.smith@example.com', '555-0101', 'active'),
    ('Sarah', 'Johnson', 'sarah.j@example.com', '555-0102', 'active'),
    ('Mike', 'Brown', 'mike.b@example.com', '555-0103', 'active'),
    ('Emily', 'Davis', 'emily.d@example.com', '555-0104', 'active')
) AS t (first_name, last_name, email, phone, status)
WHERE NOT EXISTS (
  SELECT 1 FROM public.technicians WHERE email = t.email
); 