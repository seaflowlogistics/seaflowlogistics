-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(50) PRIMARY KEY,
    customer VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Processing',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    weight VARCHAR(50),
    date DATE NOT NULL,
    driver VARCHAR(255),
    vehicle_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    driver VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Idle',
    location VARCHAR(255),
    fuel INTEGER DEFAULT 100 CHECK (fuel >= 0 AND fuel <= 100),
    maintenance VARCHAR(50) DEFAULT 'Good',
    mileage VARCHAR(50),
    next_service VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12, 2),
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(date);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(metric_type);

-- Add foreign key constraint
ALTER TABLE shipments 
ADD CONSTRAINT fk_vehicle 
FOREIGN KEY (vehicle_id) 
REFERENCES vehicles(id) 
ON DELETE SET NULL;

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
