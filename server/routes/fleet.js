import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all vehicles
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vehicles ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single vehicle
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update vehicle
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, driver, status, location, fuel, maintenance, mileage, next_service } = req.body;

        const result = await pool.query(
            `UPDATE vehicles 
       SET type = $1, driver = $2, status = $3, location = $4, fuel = $5, 
           maintenance = $6, mileage = $7, next_service = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
            [type, driver, status, location, fuel, maintenance, mileage, next_service, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get fleet statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Active') as active,
        COUNT(*) FILTER (WHERE status = 'Idle') as idle,
        COUNT(*) FILTER (WHERE status = 'Maintenance') as maintenance
      FROM vehicles
    `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get fleet stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
