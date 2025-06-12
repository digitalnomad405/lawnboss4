-- Create crew management tables

-- Create crew_roles type
CREATE TYPE public.crew_role AS ENUM ('crew_leader', 'crew_member', 'trainee');

-- Create crews table
CREATE TABLE public.crews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crews_pkey PRIMARY KEY (id)
);

-- Create crew_members table to link technicians to crews
CREATE TABLE public.crew_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    crew_id uuid NOT NULL REFERENCES public.crews(id),
    technician_id uuid NOT NULL REFERENCES public.technicians(id),
    role crew_role NOT NULL DEFAULT 'crew_member',
    is_primary_crew boolean DEFAULT false,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    end_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crew_members_pkey PRIMARY KEY (id)
);

-- Create unique index for active crew members
CREATE UNIQUE INDEX idx_unique_active_crew_member 
    ON crew_members (crew_id, technician_id, role)
    WHERE end_date IS NULL;

-- Create crew_assignments table to track crew assignments to service schedules
CREATE TABLE public.crew_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    crew_id uuid NOT NULL REFERENCES public.crews(id),
    service_schedule_id uuid NOT NULL REFERENCES public.service_schedules(id),
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'pending'::text 
        CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'completed'::text, 'cancelled'::text])),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crew_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT unique_crew_assignment UNIQUE (crew_id, service_schedule_id)
);

-- Add updated_at triggers
CREATE TRIGGER update_crews_updated_at
    BEFORE UPDATE ON crews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_members_updated_at
    BEFORE UPDATE ON crew_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_assignments_updated_at
    BEFORE UPDATE ON crew_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_crews_status ON crews(status);
CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_crew_members_technician_id ON crew_members(technician_id);
CREATE INDEX idx_crew_assignments_crew_id ON crew_assignments(crew_id);
CREATE INDEX idx_crew_assignments_service_schedule_id ON crew_assignments(service_schedule_id);
CREATE INDEX idx_crew_assignments_status ON crew_assignments(status);

-- Enable RLS
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Crews policies
CREATE POLICY "Allow read access for authenticated users"
    ON crews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON crews FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON crews FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access for authenticated users"
    ON crews FOR DELETE
    TO authenticated
    USING (true);

-- Crew members policies
CREATE POLICY "Allow read access for authenticated users"
    ON crew_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON crew_members FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON crew_members FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access for authenticated users"
    ON crew_members FOR DELETE
    TO authenticated
    USING (true);

-- Crew assignments policies
CREATE POLICY "Allow read access for authenticated users"
    ON crew_assignments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON crew_assignments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON crew_assignments FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete access for authenticated users"
    ON crew_assignments FOR DELETE
    TO authenticated
    USING (true);

-- Add comments
COMMENT ON TABLE crews IS 'Stores lawn service crews';
COMMENT ON TABLE crew_members IS 'Links technicians to crews with their roles';
COMMENT ON TABLE crew_assignments IS 'Tracks crew assignments to service schedules'; 