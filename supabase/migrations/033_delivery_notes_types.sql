-- Fix vehicle_id type in delivery_note_vehicles to match vehicles table id type
ALTER TABLE delivery_note_vehicles ALTER COLUMN vehicle_id TYPE VARCHAR(50);
