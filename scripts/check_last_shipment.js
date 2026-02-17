
import pool from '../server/config/database.js';

const checkLastShipment = async () => {
    try {
        const res = await pool.query(`
            SELECT s.id, s.created_at, s.created_by, u.username, u.email 
            FROM shipments s 
            LEFT JOIN users u ON s.created_by = u.id 
            ORDER BY s.created_at DESC 
            LIMIT 5
        `);
        console.log('Last 5 Shipments:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
};

checkLastShipment();
