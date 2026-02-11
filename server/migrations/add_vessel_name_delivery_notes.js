
import pool from '../config/database.js';

const addVesselNameToDeliveryNotes = async () => {
    const client = await pool.connect();
    try {
        console.log('Running migration: add_vessel_name_delivery_notes');

        // Add vessel_name column if it doesn't exist
        await client.query(`
            ALTER TABLE delivery_notes 
            ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(255);
        `);

        console.log('Successfully added vessel_name column to delivery_notes table');
    } catch (err) {
        console.error('Error adding vessel_name column:', err);
    } finally {
        client.release();
    }
};

addVesselNameToDeliveryNotes();
