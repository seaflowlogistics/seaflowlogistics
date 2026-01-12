import pool from './config/database.js';

async function fix() {
    try {
        await pool.query('ALTER TABLE shipment_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50)');
        console.log('Column added successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
