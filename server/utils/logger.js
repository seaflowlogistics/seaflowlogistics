
import pool from '../config/database.js';

export const logActivity = async (userId, action, details, entityType, entityId) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [userId, action, details, entityType, entityId]
        );
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't crash the app if logging fails, but it's bad.
    }
};
