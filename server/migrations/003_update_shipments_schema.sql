-- Update Shipments Table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_address TEXT,
ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS receiver_address TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100), -- Stored as "LxWxH" or JSON
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2), -- "Value"
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50);

-- Rename existing columns to map better if needed, but for now we'll alias them or keep them.
-- 'customer' can map to sender_name or be a separate billing entity. We'll keep it for backward compatibility or update data.
-- 'date' can serve as 'pickup_date'.

-- Create Documents Table
CREATE TABLE IF NOT EXISTS shipment_documents (
    id SERIAL PRIMARY KEY,
    shipment_id VARCHAR(50) REFERENCES shipments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_shipment_id ON shipment_documents(shipment_id);
