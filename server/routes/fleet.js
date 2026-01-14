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

// Create new vehicle
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { id, name, type, owner, phone, email, comments, driver, status, location } = req.body;

        const result = await pool.query(
            `INSERT INTO vehicles (id, name, type, owner, phone, email, comments, driver, status, location)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [id, name, type, owner, phone, email, comments, driver, status || 'Idle', location]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update vehicle
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, owner, phone, email, comments, driver, status, location, fuel, maintenance, mileage, next_service } = req.body;

        const result = await pool.query(
            `UPDATE vehicles 
       SET name = $1, type = $2, owner = $3, phone = $4, email = $5, comments = $6, driver = $7, status = $8, location = $9, fuel = $10, 
           maintenance = $11, mileage = $12, next_service = $13, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
            [name, type, owner, phone, email, comments, driver, status, location, fuel, maintenance, mileage, next_service, id]
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

// Delete vehicle
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Delete vehicle error:', error);
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
