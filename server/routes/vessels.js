import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

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
    const { name, registry_number, type, owner_number, captain_number } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO vessels (name, registry_number, type, owner_number, captain_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, registry_number, type, owner_number, captain_number]
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
    const { name, registry_number, type, owner_number, captain_number } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE vessels SET name = $1, registry_number = $2, type = $3, owner_number = $4, captain_number = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, registry_number, type, owner_number, captain_number, id]
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

export default router;
