import pool from '../config/database.js';

const createVesselsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vessels (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                registry_number VARCHAR(255),
                type VARCHAR(100),
                owner_number VARCHAR(100),
                captain_number VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Vessels table created successfully');
    } catch (err) {
        console.error('Error creating vessels table:', err);
    } finally {
        pool.end();
    }
};

createVesselsTable();
