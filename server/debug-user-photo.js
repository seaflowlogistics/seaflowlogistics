
import pool from './config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

async function inspectUser() {
    console.log('--- Inspecting User Data ---');
    try {
        const client = await pool.connect();

        const res = await client.query(`
            SELECT id, username, photo_url 
            FROM users 
            LIMIT 5;
        `);

        console.table(res.rows);
        client.release();
    } catch (err) {
        console.error('❌ Database Error:', err);
    }
    process.exit();
}

inspectUser();
