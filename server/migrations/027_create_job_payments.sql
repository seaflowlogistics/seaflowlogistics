CREATE TABLE IF NOT EXISTS job_payments (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(50), -- REFERENCES shipments(id) ON DELETE CASCADE (Disabled for migration stability)
    payment_type VARCHAR(100) NOT NULL, -- 'MCS Processing', 'MCS Import Duty', etc
    vendor VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL,
    bill_ref_no VARCHAR(100),
    paid_by VARCHAR(50) NOT NULL, -- 'Company', 'Customer'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON job_payments(job_id);
