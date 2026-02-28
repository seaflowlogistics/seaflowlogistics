import pool from './server/config/database.js';

async function test() {
    try {
        const date = new Date();
        const year = date.getFullYear();
        const sPattern = `S${year}-%`;
        const aPattern = `A${year}-%`;
        const result = await pool.query(
            `SELECT MAX(CAST(SUBSTRING(id FROM '-([0-9]+)$') AS INTEGER)) as max_num
         FROM shipments 
         WHERE id LIKE $1 OR id LIKE $2`,
            [sPattern, aPattern]
        );
        console.log(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
