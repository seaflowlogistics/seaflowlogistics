
import pool from './server/config/database.js';

const checkSchema = async () => {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'shipments';
        `);
        console.log("Columns:", res.rows.map(r => `${r.column_name} (${r.data_type})`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkSchema();
