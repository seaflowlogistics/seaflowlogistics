
import pool from '../config/database.js';

export const runShipmentsExporterMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Checking for shipments table updates...');
        await client.query('BEGIN');

        // Check if exporter column exists
        const checkExporterColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='shipments' AND column_name='exporter'
        `);

        if (checkExporterColumn.rows.length === 0) {
            console.log('Applying migration: Add exporter column to shipments table');
            await client.query(`
                ALTER TABLE shipments 
                ADD COLUMN exporter VARCHAR(255)
            `);
            console.log('Added exporter column to shipments table.');

            // Optional: Populate exporter from sender_name for existing records?
            // "sender_name" was likely used as "Exporter" before.
            console.log('Migrating sender_name to exporter column for existing records...');
            await client.query(`
                UPDATE shipments 
                SET exporter = sender_name 
                WHERE exporter IS NULL AND sender_name IS NOT NULL
            `);
            console.log('Migration of sender_name completed.');
        } else {
            console.log('Exporter column already exists.');
        }

        await client.query('COMMIT');
        console.log('Shipments table updates completed.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Shipments migration failed:', err);
    } finally {
        client.release();
    }
};

// Execute immediately if run directly
if (process.argv[1] === import.meta.url) {
    runShipmentsExporterMigration();
}
