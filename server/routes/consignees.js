import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../utils/upload.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();


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
    const { name, email, phone, address, code, type, passport_id, company_reg_no, gst_tin, c_number } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO consignees (name, email, phone, address, code, type, passport_id, company_reg_no, gst_tin, c_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, email, phone, address, code, type || 'Individual', passport_id, company_reg_no, gst_tin, c_number]
        );

        await logActivity(req.user.id, 'CREATE_CONSIGNEE', `Created consignee: ${name}`, 'CONSIGNEE', result.rows[0].id);

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

    const client = await pool.connect();

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors = [];

        await client.query('BEGIN');

        for (const row of data) {
            const normalizedRow = {};
            const noSpaceRow = {};

            Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim()
                    .replace(/[_\/]/g, ' ')
                    .replace(/[^a-z0-9 ]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                normalizedRow[cleanKey] = row[key];
                noSpaceRow[cleanKey.replace(/\s/g, '')] = row[key];
            });

            const name = normalizedRow['name'] || normalizedRow['consignee name'] || normalizedRow['company name'] || noSpaceRow['name'] || noSpaceRow['consigneename'] || noSpaceRow['companyname'];
            if (!name) continue;

            const email = normalizedRow['email'] || noSpaceRow['email'] || null;
            const phone = normalizedRow['phone'] || normalizedRow['contact number'] || normalizedRow['contact'] || noSpaceRow['phone'] || noSpaceRow['contactnumber'] || noSpaceRow['contact'] || null;
            const address = normalizedRow['address'] || noSpaceRow['address'] || null;
            const code = normalizedRow['code'] || noSpaceRow['code'] || null;

            // Company Fields
            const company_reg_no = normalizedRow['company reg no'] || normalizedRow['registration number'] || normalizedRow['reg no'] ||
                normalizedRow['company register number'] || normalizedRow['company registration no'] || normalizedRow['register no'] ||
                normalizedRow['id reg no'] || normalizedRow['id regno'] ||
                noSpaceRow['companyregno'] || noSpaceRow['registrationnumber'] || noSpaceRow['regno'] ||
                noSpaceRow['companyregisternumber'] || noSpaceRow['companyregistrationno'] || noSpaceRow['registerno'] ||
                noSpaceRow['idregno'] || null;

            const gst_tin = normalizedRow['gst tin'] || normalizedRow['gstin'] || normalizedRow['gst no'] || noSpaceRow['gsttin'] || noSpaceRow['gstin'] || noSpaceRow['gstno'] || null;

            const c_number = normalizedRow['c number'] || normalizedRow['c no'] || normalizedRow['c code'] || noSpaceRow['cnumber'] || noSpaceRow['cno'] || noSpaceRow['ccode'] || null;

            // Individual Fields
            const passport_id = normalizedRow['passport id'] || normalizedRow['passport'] || normalizedRow['id number'] ||
                normalizedRow['id reg no'] || normalizedRow['id regno'] ||
                noSpaceRow['passportid'] || noSpaceRow['passport'] || noSpaceRow['idnumber'] ||
                noSpaceRow['idregno'] || null;

            // Type Inference
            let typeInput = (normalizedRow['type'] || noSpaceRow['type'] || '').toString().toLowerCase();
            let type = 'Individual';
            if (typeInput.includes('company')) type = 'Company';
            else if (typeInput.includes('individual')) type = 'Individual';
            else if (company_reg_no || gst_tin || c_number) type = 'Company';

            try {
                await client.query(
                    'INSERT INTO consignees (name, email, phone, address, code, type, passport_id, company_reg_no, gst_tin, c_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                    [
                        name,
                        email,
                        phone,
                        address,
                        code,
                        type,
                        passport_id,
                        company_reg_no,
                        gst_tin,
                        c_number
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        await client.query('COMMIT');

        await logActivity(req.user.id, 'IMPORT_CONSIGNEES', `Imported ${successCount} consignees`, 'CONSIGNEE', 'BATCH');

        res.json({
            message: `Imported ${successCount} consignees`,
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

// Update consignee
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, code, type, passport_id, company_reg_no, gst_tin, c_number } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE consignees SET name = $1, email = $2, phone = $3, address = $4, code = $5, type = $6, passport_id = $7, company_reg_no = $8, gst_tin = $9, c_number = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
            [name, email, phone, address, code, type || 'Individual', passport_id, company_reg_no, gst_tin, c_number, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Consignee not found' });
        }

        await logActivity(req.user.id, 'UPDATE_CONSIGNEE', `Updated consignee: ${name}`, 'CONSIGNEE', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating consignee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete all consignees
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM consignees');
        await logActivity(req.user.id, 'DELETE_ALL_CONSIGNEES', 'Deleted all consignees', 'CONSIGNEE', 'ALL');
        res.json({ message: 'All consignees deleted successfully' });
    } catch (error) {
        console.error('Error deleting all consignees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete consignee
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM consignees WHERE id = $1', [req.params.id]);

        await logActivity(req.user.id, 'DELETE_CONSIGNEE', `Deleted consignee ID: ${req.params.id}`, 'CONSIGNEE', req.params.id);

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting consignee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
