import pool from '../config/database.js';

const addCaptainNameColumn = async () => {
    try {
        await pool.query('ALTER TABLE vessels ADD COLUMN IF NOT EXISTS captain_name VARCHAR(255);');
        console.log('Added captain_name column to vessels table');
    } catch (err) {
        console.error('Error adding captain_name column:', err);
    } finally {
        pool.end();
    }
};

addCaptainNameColumn();
