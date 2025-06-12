-- Insert test technicians if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.technicians WHERE email = 'john.smith@example.com') THEN
    INSERT INTO public.technicians (first_name, last_name, email, phone, status)
    VALUES ('John', 'Smith', 'john.smith@example.com', '555-0101', 'active');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.technicians WHERE email = 'sarah.j@example.com') THEN
    INSERT INTO public.technicians (first_name, last_name, email, phone, status)
    VALUES ('Sarah', 'Johnson', 'sarah.j@example.com', '555-0102', 'active');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.technicians WHERE email = 'mike.b@example.com') THEN
    INSERT INTO public.technicians (first_name, last_name, email, phone, status)
    VALUES ('Mike', 'Brown', 'mike.b@example.com', '555-0103', 'active');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.technicians WHERE email = 'emily.d@example.com') THEN
    INSERT INTO public.technicians (first_name, last_name, email, phone, status)
    VALUES ('Emily', 'Davis', 'emily.d@example.com', '555-0104', 'active');
  END IF;
END;
$$; 