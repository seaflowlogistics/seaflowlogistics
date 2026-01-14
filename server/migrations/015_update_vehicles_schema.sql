-- Create Vehicles Table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(100),
    owner VARCHAR(255),
    phone VARCHAR(50),
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
