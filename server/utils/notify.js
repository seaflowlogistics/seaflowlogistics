
import pool from '../config/database.js';

export const createNotification = async (userId, title, message, type = 'info', link = null, entityType = null, entityId = null) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, link, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, title, message, type, link, entityType, entityId]
        );
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

export const broadcastNotification = async (role, title, message, type = 'info', link = null, entityType = null, entityId = null) => {
    try {
        if (role === 'All') {
            const res = await pool.query('SELECT id FROM users');
            for (const user of res.rows) {
                await createNotification(user.id, title, message, type, link, entityType, entityId);
            }
        } else {
            const res = await pool.query('SELECT id FROM users WHERE role = $1', [role]);
            for (const user of res.rows) {
                await createNotification(user.id, title, message, type, link, entityType, entityId);
            }
        }
    } catch (error) {
        console.error('Error broadcasting notification:', error);
    }
};

export const broadcastToAll = async (title, message, type = 'info', link = null, entityType = null, entityId = null) => {
    try {
        const res = await pool.query('SELECT id FROM users');
        for (const user of res.rows) {
            await createNotification(user.id, title, message, type, link, entityType, entityId);
        }
    } catch (error) {
        console.error('Error broadcasting to all:', error);
    }
};
