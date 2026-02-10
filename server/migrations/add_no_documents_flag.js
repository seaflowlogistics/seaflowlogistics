
import pool from '../config/database.js';

const run = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add no_documents column to shipments table
        await client.query(`
            ALTER TABLE shipments 
            ADD COLUMN IF NOT EXISTS no_documents BOOLEAN DEFAULT FALSE
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully: Added no_documents to shipments table');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
    }
};

run().then(() => process.exit(0));
