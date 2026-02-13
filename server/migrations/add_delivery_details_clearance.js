import pool from '../config/database.js';

const run = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add columns to clearance_schedules table
        await client.query(`
            ALTER TABLE clearance_schedules 
            ADD COLUMN IF NOT EXISTS delivery_contact_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS delivery_contact_phone VARCHAR(50)
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully: Added delivery contact details to clearance_schedules table');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
};

run().then(() => process.exit(0));
