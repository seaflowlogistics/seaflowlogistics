import pool from '../config/database.js';

const run = async () => {
    try {
        console.log('Starting migration...');
        await pool.query('BEGIN');

        // Add no_documents column to shipments table
        await pool.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS no_documents BOOLEAN DEFAULT FALSE`);

        await pool.query('COMMIT');
        console.log('Shipments schema updated successfully: Added no_documents column');
        process.exit(0);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

run();
