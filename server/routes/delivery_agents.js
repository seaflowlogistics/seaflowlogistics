
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../utils/upload.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();


// Get all delivery agents
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM delivery_agents ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching delivery agents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create single delivery agent
router.post('/', authenticateToken, async (req, res) => {
    const { name, email, phone } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO delivery_agents (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
            [name, email, phone]
        );

        await logActivity(req.user.id, 'CREATE_DELIVERY_AGENT', `Created delivery agent: ${name}`, 'DELIVERY_AGENT', result.rows[0].id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating delivery agent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update delivery agent
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE delivery_agents SET name = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [name, email, phone, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery agent not found' });
        }

        await logActivity(req.user.id, 'UPDATE_DELIVERY_AGENT', `Updated delivery agent: ${name}`, 'DELIVERY_AGENT', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating delivery agent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import from Excel/CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors = [];

        for (const row of data) {
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.toLowerCase().trim()] = row[key];
            });

            const name = normalizedRow['name'] || normalizedRow['agent name'];
            if (!name) continue;

            try {
                await pool.query(
                    'INSERT INTO delivery_agents (name, email, phone) VALUES ($1, $2, $3)',
                    [
                        name,
                        normalizedRow['email'] || null,
                        normalizedRow['phone'] || null
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);

        await logActivity(req.user.id, 'IMPORT_DELIVERY_AGENTS', `Imported ${successCount} delivery agents`, 'DELIVERY_AGENT', 'BATCH');

        res.json({
            message: `Imported ${successCount} delivery agents`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Delete all delivery agents
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM delivery_agents');
        await logActivity(req.user.id, 'DELETE_ALL_DELIVERY_AGENTS', 'Deleted all delivery agents', 'DELIVERY_AGENT', 'ALL');
        res.json({ message: 'All delivery agents deleted successfully' });
    } catch (error) {
        console.error('Error deleting all delivery agents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete delivery agent
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM delivery_agents WHERE id = $1', [req.params.id]);
        await logActivity(req.user.id, 'DELETE_DELIVERY_AGENT', `Deleted delivery agent ID: ${req.params.id}`, 'DELIVERY_AGENT', req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting delivery agent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
