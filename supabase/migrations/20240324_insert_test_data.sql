-- Insert test technicians
INSERT INTO public.technicians (first_name, last_name, email, phone, status)
VALUES 
  ('John', 'Smith', 'john.smith@example.com', '555-0101', 'active'),
  ('Sarah', 'Johnson', 'sarah.j@example.com', '555-0102', 'active'),
  ('Mike', 'Brown', 'mike.b@example.com', '555-0103', 'active'),
  ('Emily', 'Davis', 'emily.d@example.com', '555-0104', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert test crews
INSERT INTO public.crews (name, description, status)
VALUES 
  ('Maintenance Crew A', 'Primary lawn maintenance team', 'active'),
  ('Landscaping Crew B', 'Specialized landscaping team', 'active')
ON CONFLICT DO NOTHING; 