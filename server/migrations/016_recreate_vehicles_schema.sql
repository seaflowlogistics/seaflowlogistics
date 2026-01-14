-- Create Vehicles Table if it doesn't exist or replace it
DROP TABLE IF EXISTS vehicles;

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
