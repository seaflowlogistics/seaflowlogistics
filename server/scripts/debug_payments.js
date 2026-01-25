import pool from '../config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        console.log('--- Checking job_payments table ---');
        const res = await pool.query('SELECT id, job_id, status, amount, created_at FROM job_payments ORDER BY created_at DESC LIMIT 10');
        console.table(res.rows);

        console.log('\n--- Checking pending payments specifically ---');
        const pending = await pool.query("SELECT * FROM job_payments WHERE status = 'Pending'");
        console.log(`Found ${pending.rows.length} pending payments.`);
        if (pending.rows.length > 0) console.table(pending.rows);

        console.log('\n--- Testing ANY query logic ---');
        const statuses = ['Pending', 'Approved'];
        // Test without cast
        try {
            const queryNoCast = "SELECT id, status FROM job_payments WHERE status = ANY($1)";
            const resNoCast = await pool.query(queryNoCast, [statuses]);
            console.log(`Query WITHOUT cast returned ${resNoCast.rows.length} rows.`);
        } catch (e) { console.log('Query WITHOUT cast failed:', e.message); }

        // Test with cast
        try {
            const queryCast = "SELECT id, status FROM job_payments WHERE status = ANY($1::text[])";
            const resCast = await pool.query(queryCast, [statuses]);
            console.log(`Query WITH cast returned ${resCast.rows.length} rows.`);
        } catch (e) { console.log('Query WITH cast failed:', e.message); }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
