import pool from '../config/database.js';

const run = async () => {
    try {
        console.log('Starting migration to add c_number to consignees...');
        await pool.query('BEGIN');

        // Add c_number column if it doesn't exist
        await pool.query(`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS c_number VARCHAR(100)`);

        await pool.query('COMMIT');
        console.log('Consignees schema updated successfully with c_number');
        process.exit(0);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

run();
