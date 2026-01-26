import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '../migrations');

async function run() {
    let client;
    try {
        console.log('Forcing delivery notes documents migration...');
        client = await pool.connect();

        const files = [
            '005_create_delivery_notes.sql',
            '029_update_delivery_notes_schema.sql',
            '032_add_documents_to_delivery_notes.sql'
        ];

        for (const file of files) {
            console.log(`Applying ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
                await client.query(sql);
                console.log(`✅ Success: ${file}`);
            } catch (e) {
                console.error(`❌ Failed ${file}:`, e.message);
            }
        }

        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

run();
