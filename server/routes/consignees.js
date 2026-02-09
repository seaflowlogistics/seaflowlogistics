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

// Import from Excel/CSV (Partial update shown for context, but focusing on create/update routes first as requested)

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
