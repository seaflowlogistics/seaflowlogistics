
import pool from './config/database.js';

const migrate = async () => {
    try {
        console.log('Migrating database to support multiple BLs and Containers...');

        // 1. Create shipment_containers table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shipment_containers (
                id SERIAL PRIMARY KEY,
                shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
                container_no TEXT,
                container_type TEXT,
                unloaded_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created shipment_containers table.');

        // 2. Create shipment_bls table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shipment_bls (
                id SERIAL PRIMARY KEY,
                shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
                master_bl TEXT,
                house_bl TEXT,
                loading_port TEXT,
                vessel TEXT,
                etd TIMESTAMP,
                eta TIMESTAMP,
                delivery_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created shipment_bls table.');

        // 3. Migrate existing data from shipments table
        const existingContainers = await pool.query('SELECT count(*) FROM shipment_containers');
        if (parseInt(existingContainers.rows[0].count) === 0) {
            console.log('Migrating existing containers...');
            await pool.query(`
                INSERT INTO shipment_containers (shipment_id, container_no, container_type, unloaded_date)
                SELECT id, container_no, container_type, unloaded_date
                FROM shipments
                WHERE container_no IS NOT NULL AND container_no != '';
            `);
        }

        const existingBLs = await pool.query('SELECT count(*) FROM shipment_bls');
        if (parseInt(existingBLs.rows[0].count) === 0) {
            console.log('Migrating existing BLs...');
            // Note: loading_port is not in shipments, so we insert NULL or map from origin if desired. Leaving as NULL for now.
            await pool.query(`
                INSERT INTO shipment_bls (shipment_id, master_bl, house_bl, loading_port, vessel, etd, eta, delivery_agent)
                SELECT id, bl_awb_no, house_bl, NULL, vessel, date, expected_delivery_date, delivery_agent
                FROM shipments
                WHERE bl_awb_no IS NOT NULL OR house_bl IS NOT NULL;
            `);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
};

migrate();
