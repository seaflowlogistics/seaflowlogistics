import pool from '../config/database.js';

const run = async () => {
    try {
        console.log('Starting migration...');
        await pool.query('BEGIN');

        // Add columns if they don't exist
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Individual'`);
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS passport_id VARCHAR(100)`);
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS company_reg_no VARCHAR(100)`);
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS gst_tin VARCHAR(100)`);

        // Ensure email and address exist (they should, based on routes/consignees.js)
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS address TEXT`);

        await pool.query('COMMIT');
        console.log('Consignees schema updated successfully');
        process.exit(0);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

run();
