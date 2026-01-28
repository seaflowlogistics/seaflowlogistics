ALTER TABLE clearance_schedules ADD COLUMN IF NOT EXISTS container_no VARCHAR(255);
ALTER TABLE clearance_schedules ADD COLUMN IF NOT EXISTS container_type VARCHAR(255);
