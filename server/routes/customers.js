import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../utils/upload.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();


// Get all customers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create single customer
router.post('/', authenticateToken, async (req, res) => {
    const { name, email, phone, address, code, type } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO customers (name, email, phone, address, code, id_reg_no, gst_tin, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, email, phone, address, code, req.body.id_reg_no || code, req.body.gst_tin, type || 'Individual']
        );

        await logActivity(req.user.id, 'CREATE_CUSTOMER', `Created customer: ${name}`, 'CUSTOMER', result.rows[0].id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, code, type } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, code = $5, id_reg_no = $6, gst_tin = $7, type = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
            [name, email, phone, address, code, req.body.id_reg_no || code, req.body.gst_tin, type, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        await logActivity(req.user.id, 'UPDATE_CUSTOMER', `Updated customer: ${name}`, 'CUSTOMER', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
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
            const noSpaceRow = {};

            Object.keys(row).forEach(key => {
                // Robust cleaning:
                // 1. Lowercase, trim
                // 2. Replace _ / with space
                // 3. Remove non standard chars
                // 4. Collapse spaces
                const cleanKey = key.toLowerCase().trim()
                    .replace(/[_\/]/g, ' ')
                    .replace(/[^a-z0-9 ]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                normalizedRow[cleanKey] = row[key];
                noSpaceRow[cleanKey.replace(/\s/g, '')] = row[key];
            });

            const name = normalizedRow['name'] || normalizedRow['customer name'] || normalizedRow['company name'] || noSpaceRow['name'] || noSpaceRow['customername'] || noSpaceRow['companyname'];
            if (!name) continue;

            // ID / Reg No mapping
            const code = normalizedRow['id reg no'] || normalizedRow['registration number'] || normalizedRow['reg no'] || normalizedRow['id passport number'] || normalizedRow['code'] || normalizedRow['id'] ||
                noSpaceRow['idregno'] || noSpaceRow['registrationnumber'] || noSpaceRow['regno'] || noSpaceRow['idpassportnumber'] || noSpaceRow['code'] || noSpaceRow['id'] || null;

            const gst_tin = normalizedRow['gst tin'] || normalizedRow['gstin'] || noSpaceRow['gsttin'] || noSpaceRow['gstin'] || null;

            let typeInput = (normalizedRow['type'] || noSpaceRow['type'] || '').toString().toLowerCase();
            let type = 'Individual';
            if (typeInput.includes('company')) type = 'Company';
            else if (typeInput.includes('individual')) type = 'Individual';
            else if (gst_tin) type = 'Company';

            let address = normalizedRow['address'] || noSpaceRow['address'] || '';

            // Follow frontend pattern: append GSTIN to address for companies
            if (type === 'Company' && gst_tin) {
                const gstinStr = `GSTIN: ${gst_tin}`;
                if (address) {
                    if (!address.toString().includes('GSTIN:')) {
                        address = `${address}\n\n${gstinStr}`;
                    }
                } else {
                    address = gstinStr;
                }
            }

            try {
                await pool.query(
                    'INSERT INTO customers (name, email, phone, address, code, id_reg_no, gst_tin, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [
                        name,
                        normalizedRow['email'] || noSpaceRow['email'] || null,
                        normalizedRow['phone'] || normalizedRow['contact number'] || normalizedRow['contact'] || noSpaceRow['phone'] || noSpaceRow['contactnumber'] || noSpaceRow['contact'] || null,
                        address || null,
                        code,
                        code, // Use code as id_reg_no during import
                        gst_tin,
                        type
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);

        await logActivity(req.user.id, 'IMPORT_CUSTOMERS', `Imported ${successCount} customers`, 'CUSTOMER', 'BATCH');

        res.json({
            message: `Imported ${successCount} customers`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Delete all customers
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM customers');
        await logActivity(req.user.id, 'DELETE_ALL_CUSTOMERS', 'Deleted all customers', 'CUSTOMER', 'ALL');
        res.json({ message: 'All customers deleted successfully' });
    } catch (error) {
        console.error('Error deleting all customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete customer
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);

        await logActivity(req.user.id, 'DELETE_CUSTOMER', `Deleted customer ID: ${req.params.id}`, 'CUSTOMER', req.params.id);

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
