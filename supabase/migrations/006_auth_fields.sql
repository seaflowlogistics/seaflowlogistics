-- Add email and reset token columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;

-- Ideally we would want email to be NOT NULL, but for backfill we'll leave it simple for create
-- For production, existing users should be updated and then the constraint added
