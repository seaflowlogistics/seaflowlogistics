import pool from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
    try {
        console.log('Applying 015_update_vehicles_schema.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '015_update_vehicles_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migration applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    }
};

run();
