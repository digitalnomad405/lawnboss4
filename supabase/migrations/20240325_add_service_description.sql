-- Add description column to service_schedules table
ALTER TABLE service_schedules ADD COLUMN description TEXT;

-- Update existing services to use service type label as description
UPDATE service_schedules ss
SET description = st.label
FROM service_types st
WHERE ss.service_type_id = st.id AND ss.description IS NULL;

-- Create index for description column to improve search performance
CREATE INDEX idx_service_schedules_description ON service_schedules(description); 