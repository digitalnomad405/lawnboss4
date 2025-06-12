-- Drop foreign key constraints first
ALTER TABLE IF EXISTS public.technician_skills
DROP CONSTRAINT IF EXISTS technician_skills_technician_id_fkey,
DROP CONSTRAINT IF EXISTS technician_skills_service_type_id_fkey;

-- Drop the table
DROP TABLE IF EXISTS public.technician_skills; 