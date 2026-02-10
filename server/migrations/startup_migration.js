
import pool from '../config/database.js';

export const runMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('Checking for pending migrations...');

        await client.query('BEGIN');

        // Migration: Add no_documents column
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='shipments' AND column_name='no_documents'
        `);

        if (checkColumn.rows.length === 0) {
            console.log('Applying migration: Add no_documents column to shipments table');
            await client.query(`
                ALTER TABLE shipments 
                ADD COLUMN IF NOT EXISTS no_documents BOOLEAN DEFAULT FALSE
            `);
        } else {
            console.log('Migration skipped: no_documents column already exists');
        }

        await client.query('COMMIT');
        console.log('Migration check completed.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration check failed:', err);
    } finally {
        client.release();
    }
};
