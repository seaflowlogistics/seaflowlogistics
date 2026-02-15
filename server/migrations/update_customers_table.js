
import pool from '../config/database.js';

export const runCustomersMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Checking for customers table updates...');
        await client.query('BEGIN');

        // 1. Add gst_tin column if it doesn't exist
        const checkGstColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='customers' AND column_name='gst_tin'
        `);

        if (checkGstColumn.rows.length === 0) {
            console.log('Applying migration: Add gst_tin column to customers table');
            await client.query(`
                ALTER TABLE customers 
                ADD COLUMN gst_tin VARCHAR(100)
            `);
        }

        // 2. Data Migration: Extract GSTIN from address to gst_tin column
        // Only do this for records where gst_tin is currently null
        console.log('Migrating existing GSTIN data from address to native column...');
        const customersWithGstInAddress = await client.query(`
            SELECT id, address FROM customers 
            WHERE address LIKE '%GSTIN:%' AND (gst_tin IS NULL OR gst_tin = '')
        `);

        for (const row of customersWithGstInAddress.rows) {
            const parts = row.address.split('GSTIN:');
            if (parts.length > 1) {
                const rawAddress = parts[0].trim();
                const gstValue = parts[1].trim();

                await client.query(
                    'UPDATE customers SET address = $1, gst_tin = $2 WHERE id = $3',
                    [rawAddress, gstValue, row.id]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Customers table updates completed.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Customers migration failed:', err);
    } finally {
        client.release();
    }
};
