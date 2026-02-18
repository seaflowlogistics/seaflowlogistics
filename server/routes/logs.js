import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
// router.use(authorizeRole(['Administrator'])); // Allow all authenticated users


router.get('/', async (req, res) => {
    try {
        const { search, date } = req.query;
        let query = `
            SELECT a.*, u.username as performed_by, u.role as user_role
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(u.username ILIKE $${params.length + 1} OR a.action ILIKE $${params.length + 1} OR a.details ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (date) {
            // Filter by date (ignoring time) without wrapping the column
            params.push(date);
            conditions.push(`a.created_at >= $${params.length}::date AND a.created_at < ($${params.length}::date + INTERVAL '1 day')`);
        }

        if (req.query.entity_id) {
            conditions.push(`a.entity_id = $${params.length + 1}`);
            params.push(req.query.entity_id);
        }

        if (req.query.entity_type) {
            conditions.push(`a.entity_type = $${params.length + 1}`);
            params.push(req.query.entity_type);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY a.created_at DESC LIMIT 100';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
