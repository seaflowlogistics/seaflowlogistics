import pool from '../config/database.js';

async function migrate() {
    try {
        console.log('Running add_shipments_indexes migration...');

        // Add indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(customer);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_shipments_transport ON shipments(transport_mode);');

        console.log('Successfully created indexes on shipments table');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error; // Re-throw to allow caller to handle
    } finally {
        // Option to close pool if running standalone
        if (require.main === module) {
            await pool.end();
            process.exit(0);
        }
    }
}

export default migrate;

if (typeof require !== 'undefined' && require.main === module) {
    migrate();
}
