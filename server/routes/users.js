import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Ensure only Administrators can manage users
router.use(authenticateToken);
router.use(authorizeRole(['Administrator']));

const VALID_ROLES = [
    'Administrator',
    'Administrator Assistant',
    'Accountant',
    'Accountant Assistant',
    'Clearance Manager',
    'Clearance Manager Assistant'
];

// Get all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
            [username, hashedPassword, role]
        );

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_USER', `Created user ${username} with role ${role}`, 'USER', result.rows[0].id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username already exists' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { role, password, username } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        let query = 'UPDATE users SET ';
        const values = [];
        let index = 1;

        if (role) {
            query += `role = $${index}, `;
            values.push(role);
            index++;
        }

        if (username) {
            query += `username = $${index}, `;
            values.push(username);
            index++;
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `password = $${index}, `;
            values.push(hashedPassword);
            index++;
        }

        if (values.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ` WHERE id = $${index} RETURNING id, username, role`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_USER', `Updated user ${result.rows[0].username}`, 'USER', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username already exists' });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    try {
        const check = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const usernameToDelete = check.rows[0].username;

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'DELETE_USER', `Deleted user ${usernameToDelete}`, 'USER', id]
        );

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
