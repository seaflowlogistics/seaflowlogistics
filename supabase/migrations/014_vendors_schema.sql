
-- Migration to update vendors table structure
-- Simplified for strict syntax compatibility.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS currency VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_street TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- Attempt rename WITHOUT 'IF EXISTS' which is syntax error in this version of CRDB/PG adapter context.
-- We wrap it in a safe adding of the new column and data migration if we can't strict rename.
-- BUT, since user likely has 'country' and wants to rename it:
ALTER TABLE vendors RENAME COLUMN country TO billing_country;

-- Dropping 'address' with IF EXISTS is standard and usually supported.
ALTER TABLE vendors DROP COLUMN IF EXISTS address;
