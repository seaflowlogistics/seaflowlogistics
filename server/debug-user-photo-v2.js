
import pool from './config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

async function inspectUser() {
    console.log('--- Inspecting User Data (Correct Env) ---');
    console.log('DB URL:', process.env.DATABASE_URL ? 'Matches .env' : 'Not Set');

    try {
        const client = await pool.connect();

        const res = await client.query(`
            SELECT id, username, photo_url 
            FROM users 
            WHERE username = 'admin';
        `);

        console.table(res.rows);
        client.release();
    } catch (err) {
        console.error('❌ Database Error:', err);
    }
    process.exit();
}

inspectUser();
