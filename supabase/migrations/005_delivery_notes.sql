-- Create Delivery Notes Table
CREATE TABLE IF NOT EXISTS delivery_notes (
    id VARCHAR(50) PRIMARY KEY, -- DN-YYYY...
    shipment_id VARCHAR(50), -- REFERENCES shipments(id) ON DELETE CASCADE (Disabled for migration stability)
    consignee VARCHAR(255),
    exporter VARCHAR(255),
    details_location VARCHAR(255),
    details_type VARCHAR(50) DEFAULT 'BL / AWB',
    issued_date DATE DEFAULT CURRENT_DATE,
    issued_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Delivered, Completed
    
    -- Additional fields for manual updates
    unloading_date DATE,
    signed_document_path TEXT,
    comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link table for multiple jobs per delivery note
CREATE TABLE IF NOT EXISTS delivery_note_jobs (
    id SERIAL PRIMARY KEY,
    delivery_note_id VARCHAR(50) REFERENCES delivery_notes(id) ON DELETE CASCADE,
    job_no VARCHAR(50), -- Reference to job ID (or shipment ID if 1:1)
    packages_count INTEGER,
    packages_type VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(issued_date);
