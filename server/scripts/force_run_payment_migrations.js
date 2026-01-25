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
        console.log('Forcing payment migrations...');
        client = await pool.connect();

        const files = [
            '027_create_job_payments.sql',
            '028_update_job_payments.sql',
            '029_add_payment_process_fields.sql'
        ];

        for (const file of files) {
            console.log(`Applying ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
                await client.query(sql);
                console.log(`✅ Success: ${file}`);
            } catch (e) {
                console.error(`❌ Failed ${file}:`, e.message);
                // We continue even if one fails, maybe 027 fails because it exists (unlikely given previous error) but 028/029 might work
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
