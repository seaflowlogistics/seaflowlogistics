-- Recreate Vehicles Table
-- 1. Drop existing FK constraint from shipments
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS fk_vehicle;

-- 2. Drop the existing vehicles table
DROP TABLE IF EXISTS vehicles;

-- 3. Create the new vehicles table
CREATE TABLE vehicles (
    id VARCHAR(50) PRIMARY KEY, -- Registration No.
    name VARCHAR(255),
    type VARCHAR(100),
    owner VARCHAR(255), -- Owner Name
    phone VARCHAR(50), -- Owner Phone
    email VARCHAR(255), -- Owner Email
    comments TEXT,
    driver VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Idle',
    location VARCHAR(255),
    fuel INTEGER DEFAULT 100,
    maintenance VARCHAR(50) DEFAULT 'Good',
    mileage VARCHAR(50),
    next_service VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Re-add the FK constraint to shipments
-- Note: existing vehicle_ids in shipments might now invalid if we deleted the vehicle data.
-- However, since ON DELETE SET NULL was used previously (if deleted individual rows), here we dropped the table.
-- Any referencing rows would block DROP TABLE unless we dropped constraint first.
-- After recreating, if shipments still have vehicle_ids, they might reference non-existent vehicles.
-- We should probably NULL them out to be safe, or assume USER knows data is wiped.
-- Given User said "remove the reference vehicles", cleaning up shipments is safer.
UPDATE shipments SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL;

ALTER TABLE shipments 
ADD CONSTRAINT fk_vehicle 
FOREIGN KEY (vehicle_id) 
REFERENCES vehicles(id) 
ON DELETE SET NULL;
