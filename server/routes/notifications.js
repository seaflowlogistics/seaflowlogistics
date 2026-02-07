
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Everyone only sees their own notifications
        const query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50';
        const params = [req.user.id];

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

// Delete single notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const isAdmin = ['Administrator', 'All'].includes(req.user.role);

        if (isAdmin) {
            await pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
        } else {
            await pool.query(
                'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
                [req.params.id, req.user.id]
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Delete batch notifications
router.post('/delete-batch', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }

        const isAdmin = ['Administrator', 'All'].includes(req.user.role);

        if (isAdmin) {
            await pool.query(
                'DELETE FROM notifications WHERE id = ANY($1)',
                [ids]
            );
        } else {
            await pool.query(
                'DELETE FROM notifications WHERE id = ANY($1) AND user_id = $2',
                [ids, req.user.id]
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notifications batch:', error);
        res.status(500).json({ error: 'Failed to delete notifications' });
    }
});

// Delete all notifications (for user)
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        // Even for admin, delete-all probably implies "Clear My Feed". 
        // But since Admin feed includes everyone, "Delete All" would wipe the DB.
        // Given the feature is hidden, I'll stricter it to user_id for safety unless requested otherwise.
        // But to be consistent with "Admin sees all", if they could click it, they might expect all gone.
        // I will leave it matched to user_id for safety for now as it is unused.
        await pool.query(
            'DELETE FROM notifications WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ error: 'Failed to delete notifications' });
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
