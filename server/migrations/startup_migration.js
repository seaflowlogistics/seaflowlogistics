
import pool from '../config/database.js';

export const runMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('Checking for pending migrations...');

        await client.query('BEGIN');

        // Migration: Add no_documents column
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='shipments' AND column_name='no_documents'
        `);

        if (checkColumn.rows.length === 0) {
            console.log('Applying migration: Add no_documents column to shipments table');
            await client.query(`
                ALTER TABLE shipments 
                ADD COLUMN IF NOT EXISTS no_documents BOOLEAN DEFAULT FALSE
            `);
        } else {
            console.log('Migration skipped: no_documents column already exists');
        }

        // Migration: Add captain_name column to vessels table
        const checkCaptainColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='vessels' AND column_name='captain_name'
        `);

        if (checkCaptainColumn.rows.length === 0) {
            console.log('Applying migration: Add captain_name column to vessels table');
            await client.query(`
                ALTER TABLE vessels 
                ADD COLUMN IF NOT EXISTS captain_name VARCHAR(255)
            `);
        } else {
            console.log('Migration skipped: captain_name column already exists');
        }

        // Migration: Add vessel_name column to delivery_notes table
        const checkVesselNameColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='delivery_notes' AND column_name='vessel_name'
        `);

        if (checkVesselNameColumn.rows.length === 0) {
            console.log('Applying migration: Add vessel_name column to delivery_notes table');
            await client.query(`
                ALTER TABLE delivery_notes 
                ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(255)
            `);
        } else {
            console.log('Migration skipped: vessel_name column already exists');
        }

        // Migration: Add notifications columns (entity_type, entity_id)
        const checkNotificationCols = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='notifications' AND column_name='entity_type'
        `);

        if (checkNotificationCols.rows.length === 0) {
            console.log('Applying migration: Add entity_type/id columns to notifications table');
            await client.query(`
                ALTER TABLE notifications 
                ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
                ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255)
            `);
        } else {
            console.log('Migration skipped: notifications entity columns already exist');
        }

        // Migration: Customers Table
        const checkTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'customers'
            );
        `);

        if (!checkTable.rows[0].exists) {
            console.log('Applying migration: Create customers table');
            await client.query(`
                CREATE TABLE customers (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    address TEXT,
                    code VARCHAR(50),
                    id_reg_no VARCHAR(100),
                    gst_tin VARCHAR(100),
                    type VARCHAR(50) DEFAULT 'Individual',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } else {
            // Table exists, check for specific columns
            const columns = await client.query(`
                SELECT column_name FROM information_schema.columns WHERE table_name = 'customers'
            `);
            const colNames = columns.rows.map(c => c.column_name);

            if (!colNames.includes('gst_tin')) {
                console.log('Applying migration: Add gst_tin to customers');
                await client.query('ALTER TABLE customers ADD COLUMN gst_tin VARCHAR(100)');
            }
            if (!colNames.includes('id_reg_no')) {
                console.log('Applying migration: Add id_reg_no to customers');
                await client.query('ALTER TABLE customers ADD COLUMN id_reg_no VARCHAR(100)');
            }
            if (!colNames.includes('type')) {
                console.log('Applying migration: Add type to customers');
                await client.query("ALTER TABLE customers ADD COLUMN type VARCHAR(50) DEFAULT 'Individual'");
            }
        }

        await client.query('COMMIT');
        console.log('Migration check completed.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration check failed:', err);
    } finally {
        client.release();
    }
};
