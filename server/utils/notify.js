
import pool from '../config/database.js';

export const createNotification = async (userId, title, message, type = 'info', link = null) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)',
            [userId, title, message, type, link]
        );
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

export const broadcastNotification = async (role, title, message, type = 'info', link = null) => {
    try {
        if (role === 'All') {
            const res = await pool.query('SELECT id FROM users');
            for (const user of res.rows) {
                await createNotification(user.id, title, message, type, link);
            }
        } else {
            const res = await pool.query('SELECT id FROM users WHERE role = $1', [role]);
            for (const user of res.rows) {
                await createNotification(user.id, title, message, type, link);
            }
        }
    } catch (error) {
        console.error('Error broadcasting notification:', error);
    }
};

export const broadcastToAll = async (title, message, type = 'info', link = null) => {
    try {
        const res = await pool.query('SELECT id FROM users');
        for (const user of res.rows) {
            await createNotification(user.id, title, message, type, link);
        }
    } catch (error) {
        console.error('Error broadcasting to all:', error);
    }
};
