
-- Migration to add packages column to clearance_schedules
ALTER TABLE clearance_schedules ADD COLUMN IF NOT EXISTS packages VARCHAR(50);
