-- Add recurrence fields to service_schedules table
ALTER TABLE service_schedules
ADD COLUMN recurrence_type text CHECK (recurrence_type IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'custom')),
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_days integer[] DEFAULT '{}',
ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN end_date date,
ADD COLUMN last_scheduled_date date,
ADD COLUMN next_scheduled_date date,
ADD COLUMN auto_schedule boolean DEFAULT false,
ADD COLUMN auto_invoice boolean DEFAULT false;

-- Create service_schedule_instances table for actual service dates
CREATE TABLE service_schedule_instances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_schedule_id uuid NOT NULL REFERENCES service_schedules(id) ON DELETE CASCADE,
    scheduled_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
    crew_id uuid REFERENCES crews(id),
    completed_at timestamp with time zone,
    completed_by uuid REFERENCES auth.users(id),
    notes text,
    weather_conditions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT service_schedule_instances_pkey PRIMARY KEY (id)
);

-- Create function to generate next service date
CREATE OR REPLACE FUNCTION calculate_next_service_date(
    p_current_date date,
    p_recurrence_type text,
    p_recurrence_interval integer,
    p_recurrence_days integer[],
    p_end_date date DEFAULT NULL
)
RETURNS date AS $$
DECLARE
    next_date date;
BEGIN
    CASE p_recurrence_type
        WHEN 'one_time' THEN
            RETURN NULL;
        WHEN 'weekly' THEN
            next_date := p_current_date + (p_recurrence_interval * 7 || ' days')::interval;
        WHEN 'bi_weekly' THEN
            next_date := p_current_date + (p_recurrence_interval * 14 || ' days')::interval;
        WHEN 'monthly' THEN
            next_date := p_current_date + (p_recurrence_interval || ' months')::interval;
        WHEN 'custom' THEN
            -- For custom recurrence, find the next available day from recurrence_days
            next_date := p_current_date + 1;
            WHILE NOT EXTRACT(DOW FROM next_date) = ANY(p_recurrence_days) LOOP
                next_date := next_date + 1;
            END LOOP;
        ELSE
            RETURN NULL;
    END CASE;

    -- Check if the next date is after end_date
    IF p_end_date IS NOT NULL AND next_date > p_end_date THEN
        RETURN NULL;
    END IF;

    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to schedule next service
CREATE OR REPLACE FUNCTION schedule_next_service()
RETURNS trigger AS $$
BEGIN
    -- Only proceed if auto_schedule is enabled
    IF NEW.auto_schedule THEN
        -- Calculate next service date
        NEW.next_scheduled_date := calculate_next_service_date(
            COALESCE(NEW.last_scheduled_date, NEW.start_date),
            NEW.recurrence_type,
            NEW.recurrence_interval,
            NEW.recurrence_days,
            NEW.end_date
        );
        
        -- If we have a next date, create a service instance
        IF NEW.next_scheduled_date IS NOT NULL THEN
            INSERT INTO service_schedule_instances (
                service_schedule_id,
                scheduled_date,
                status
            ) VALUES (
                NEW.id,
                NEW.next_scheduled_date,
                'pending'
            );
            
            -- Update last scheduled date
            NEW.last_scheduled_date := NEW.next_scheduled_date;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scheduling next service
CREATE TRIGGER schedule_next_service_trigger
    BEFORE INSERT OR UPDATE ON service_schedules
    FOR EACH ROW
    EXECUTE FUNCTION schedule_next_service();

-- Create indexes
CREATE INDEX idx_service_schedule_instances_service_schedule_id 
    ON service_schedule_instances(service_schedule_id);
CREATE INDEX idx_service_schedule_instances_scheduled_date 
    ON service_schedule_instances(scheduled_date);
CREATE INDEX idx_service_schedule_instances_status 
    ON service_schedule_instances(status);
CREATE INDEX idx_service_schedule_instances_crew_id 
    ON service_schedule_instances(crew_id);

-- Enable RLS
ALTER TABLE service_schedule_instances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to authenticated users"
    ON service_schedule_instances FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin and office staff"
    ON service_schedule_instances FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'office_staff')
        )
    );

CREATE POLICY "Allow update to admin, office staff, and assigned crew"
    ON service_schedule_instances FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            LEFT JOIN crew_members cm ON cm.technician_id = up.id
            WHERE up.user_id = auth.uid()
            AND (
                up.role IN ('admin', 'office_staff')
                OR cm.crew_id = service_schedule_instances.crew_id
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            LEFT JOIN crew_members cm ON cm.technician_id = up.id
            WHERE up.user_id = auth.uid()
            AND (
                up.role IN ('admin', 'office_staff')
                OR cm.crew_id = service_schedule_instances.crew_id
            )
        )
    );

-- Add comments
COMMENT ON TABLE service_schedule_instances IS 'Stores individual service appointments generated from service schedules';
COMMENT ON COLUMN service_schedules.recurrence_type IS 'Type of service recurrence (one_time, weekly, bi_weekly, monthly, custom)';
COMMENT ON COLUMN service_schedules.recurrence_interval IS 'Interval between recurring services';
COMMENT ON COLUMN service_schedules.recurrence_days IS 'Array of days (0-6) for custom recurrence';
COMMENT ON COLUMN service_schedules.auto_schedule IS 'Whether to automatically schedule next service';
COMMENT ON COLUMN service_schedules.auto_invoice IS 'Whether to automatically generate invoice after service completion'; 