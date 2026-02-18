import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import upload from '../utils/upload.js';
import XLSX from 'xlsx';
import fs from 'fs';

const router = express.Router();

// Get all vessels
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vessels ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching vessels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create vessel
router.post('/', authenticateToken, async (req, res) => {
    const { name, registry_number, type, owner_number, captain_number, captain_name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO vessels (name, registry_number, type, owner_number, captain_number, captain_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, registry_number, type, owner_number, captain_number, captain_name]
        );

        await logActivity(req.user.id, 'CREATE_VESSEL', `Created vessel: ${name}`, 'VESSEL', result.rows[0].id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating vessel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update vessel
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, registry_number, type, owner_number, captain_number, captain_name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE vessels SET name = $1, registry_number = $2, type = $3, owner_number = $4, captain_number = $5, captain_name = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, registry_number, type, owner_number, captain_number, captain_name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vessel not found' });
        }

        await logActivity(req.user.id, 'UPDATE_VESSEL', `Updated vessel: ${name}`, 'VESSEL', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating vessel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete vessel
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM vessels WHERE id = $1', [req.params.id]);
        await logActivity(req.user.id, 'DELETE_VESSEL', `Deleted vessel ID: ${req.params.id}`, 'VESSEL', req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting vessel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete all vessels
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM vessels');
        await logActivity(req.user.id, 'DELETE_ALL_VESSELS', 'Deleted all vessels', 'VESSEL', 'ALL');
        res.json({ message: 'All vessels deleted successfully' });
    } catch (error) {
        console.error('Error deleting all vessels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import from Excel/CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const client = await pool.connect();

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'File appears to be empty or contains no data rows.' });
        }

        let successCount = 0;
        let errors = [];

        await client.query('BEGIN');

        for (const row of data) {
            const normalizedRow = {};

            Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim()
                    .replace(/[_\/]/g, ' ')
                    .replace(/[^a-z0-9 ]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                normalizedRow[cleanKey] = row[key];
            });

            // Name
            const name = normalizedRow['name'] || normalizedRow['vessel name'] || normalizedRow['vessel'];

            // Registry No
            const registry_number = normalizedRow['registry no'] || normalizedRow['registry number'] || normalizedRow['reg no'];

            // Type
            const type = normalizedRow['type'] || 'Dhoni';

            // Owner No
            const owner_number = normalizedRow['owner no'] || normalizedRow['owner number'] || normalizedRow['owner contact'] || normalizedRow['owner phone'];

            // Captain No
            const captain_number = normalizedRow['captain no'] || normalizedRow['captain number'] || normalizedRow['captain contact'] || normalizedRow['captain phone'];

            // Captain Name
            const captain_name = normalizedRow['captain name'] || normalizedRow['captain'];


            if (!name) continue;

            try {
                await client.query(
                    'INSERT INTO vessels (name, registry_number, type, owner_number, captain_number, captain_name) VALUES ($1, $2, $3, $4, $5, $6)',
                    [name, registry_number || null, type, owner_number || null, captain_number || null, captain_name || null]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        await client.query('COMMIT');

        await logActivity(req.user.id, 'IMPORT_VESSELS', `Imported ${successCount} vessels`, 'VESSEL', 'BATCH');

        res.json({
            message: `Imported ${successCount} vessels`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    } finally {
        client.release();
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

export default router;
