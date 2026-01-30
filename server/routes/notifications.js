
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const isAdmin = ['Administrator', 'All'].includes(req.user.role);

        let query;
        let params;

        if (isAdmin) {
            // Admin sees all notifications joined with user info
            query = `
                SELECT n.*, u.username as user_name, u.role as user_role 
                FROM notifications n 
                LEFT JOIN users u ON n.user_id = u.id 
                ORDER BY n.created_at DESC LIMIT 50
            `;
            params = [];
        } else {
            // Regular users see only their own
            query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20';
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;
