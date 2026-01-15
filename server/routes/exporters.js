import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all exporters
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exporters ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching exporters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create single exporter
router.post('/', authenticateToken, async (req, res) => {
    const { name, email, phone, address, country } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO exporters (name, email, phone, address, country) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, phone, address, country]
        );

        await logActivity(req.user.id, 'CREATE_EXPORTER', `Created exporter: ${name}`, 'EXPORTER', result.rows[0].id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating exporter:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update exporter
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, country } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE exporters SET name = $1, email = $2, phone = $3, address = $4, country = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, email, phone, address, country, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exporter not found' });
        }

        await logActivity(req.user.id, 'UPDATE_EXPORTER', `Updated exporter: ${name}`, 'EXPORTER', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating exporter:', error);
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
                const cleanKey = key.toLowerCase().trim().replace(/_/g, ' ').replace(/\./g, '');
                normalizedRow[cleanKey] = row[key];
            });

            // Map headers based on user request and common variations
            // Header: Exporter Name -> name
            const name = normalizedRow['exporter name'] || normalizedRow['name'] || normalizedRow['exporter'];

            // Header: Contact No. -> phone
            const phone = normalizedRow['contact no'] || normalizedRow['contact number'] || normalizedRow['phone'] || normalizedRow['mobile'];

            // Header: Mail -> email
            const email = normalizedRow['mail'] || normalizedRow['email'] || normalizedRow['e-mail'];

            // Header: Address -> address
            const address = normalizedRow['address'] || normalizedRow['location'];

            // Optional: Country if present
            const country = normalizedRow['country'];

            if (!name) continue;

            try {
                // Check if exists
                const checkRes = await pool.query('SELECT id FROM exporters WHERE name = $1', [name]);
                if (checkRes.rows.length > 0) {
                    // Exporter exists, maybe update? For now sticking to insert if new.
                    // Or we could update contact details if missing.
                    errors.push(`Exporter '${name}' already exists.`);
                    continue;
                }

                await pool.query(
                    'INSERT INTO exporters (name, email, phone, address, country) VALUES ($1, $2, $3, $4, $5)',
                    [
                        name,
                        email || null,
                        phone ? String(phone) : null,
                        address || null,
                        country || null // If they provide country separately, good. If not, address is what we have.
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);

        await logActivity(req.user.id, 'IMPORT_EXPORTERS', `Imported ${successCount} exporters`, 'EXPORTER', 'BATCH');

        res.json({
            message: `Imported ${successCount} exporters`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Delete exporter
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM exporters WHERE id = $1', [req.params.id]);

        await logActivity(req.user.id, 'DELETE_EXPORTER', `Deleted exporter ID: ${req.params.id}`, 'EXPORTER', req.params.id);

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting exporter:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
