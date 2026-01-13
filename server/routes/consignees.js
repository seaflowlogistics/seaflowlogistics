
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all consignees
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM consignees ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching consignees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create single consignee
router.post('/', authenticateToken, async (req, res) => {
    const { name, email, phone, address, code } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO consignees (name, email, phone, address, code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, phone, address, code]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating consignee:', error);
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

        for (const row of data) { // Using for...of loop for async operations
            // Expecting headers: Name, Email, Phone, Address, Code (or similar case-insensitive map)
            // Let's normalize keys
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.toLowerCase()] = row[key];
            });

            const name = normalizedRow['name'] || normalizedRow['consignee name'];
            if (!name) continue; // Skip empty names

            try {
                await pool.query(
                    'INSERT INTO consignees (name, email, phone, address, code) VALUES ($1, $2, $3, $4, $5)',
                    [
                        name,
                        normalizedRow['email'] || null,
                        normalizedRow['phone'] || null,
                        normalizedRow['address'] || null,
                        normalizedRow['code'] || normalizedRow['id'] || null
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        // Cleanup
        fs.unlinkSync(req.file.path);

        res.json({
            message: `Imported ${successCount} consignees`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Update consignee
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, code } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE consignees SET name = $1, email = $2, phone = $3, address = $4, code = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, email, phone, address, code, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Consignee not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating consignee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete consignee
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM consignees WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting consignee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
