
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

        // Migration: Add captain_name column to vessels table
        const checkCaptainColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='vessels' AND column_name='captain_name'
        `);

        if (checkCaptainColumn.rows.length === 0) {
            console.log('Applying migration: Add captain_name column to vessels table');
            await client.query(`
                ALTER TABLE vessels 
                ADD COLUMN IF NOT EXISTS captain_name VARCHAR(255)
            `);
        } else {
            console.log('Migration skipped: captain_name column already exists');
        }

        // Migration: Add vessel_name column to delivery_notes table
        const checkVesselNameColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='delivery_notes' AND column_name='vessel_name'
        `);

        if (checkVesselNameColumn.rows.length === 0) {
            console.log('Applying migration: Add vessel_name column to delivery_notes table');
            await client.query(`
                ALTER TABLE delivery_notes 
                ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(255)
            `);
        } else {
            console.log('Migration skipped: vessel_name column already exists');
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
