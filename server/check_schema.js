
import pool from './config/database.js';

const checkSchema = async () => {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'shipments';
        `);
        console.log('Columns in shipments:', res.rows.map(r => r.column_name).join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkSchema();
