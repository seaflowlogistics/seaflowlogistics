import pool from './config/database.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from server directory if running from root
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const run = async () => {
    try {
        console.log('Updating delivery_notes schema...');
        await pool.query(`
            ALTER TABLE delivery_notes 
            ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50),
            ADD COLUMN IF NOT EXISTS captain_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS captain_contact VARCHAR(100),
            ADD COLUMN IF NOT EXISTS discharge_location VARCHAR(255);
        `);
        console.log('Schema updated successfully');
    } catch (e) {
        console.error('Error updating schema:', e);
    } finally {
        process.exit();
    }
};

run();
