
import pool from '../config/database.js';

export const runShipmentsCreatedByMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Checking for shipments table updates (created_by)...');
        await client.query('BEGIN');

        // Check if created_by column exists
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='shipments' AND column_name='created_by'
        `);

        if (checkColumn.rows.length === 0) {
            console.log('Applying migration: Add created_by column to shipments table');
            await client.query(`
                ALTER TABLE shipments 
                ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('Added created_by column to shipments table.');

            // Note: We cannot easily backfill this data unless we have audit logs that reliably track creation.
            // For now, existing records will have NULL created_by.
        } else {
            console.log('created_by column already exists.');
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
    runShipmentsCreatedByMigration();
}
