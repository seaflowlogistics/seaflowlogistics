import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

const VALID_ROLES = [
    'Administrator',

    'Accountant',
    'Clearance',
    'Documentation',
    'All'
];

// Helper to validate roles
const validateRoles = (role) => {
    if (Array.isArray(role)) {
        return role.every(r => VALID_ROLES.includes(r));
    }
    return VALID_ROLES.includes(role);
};

// Helper to format roles for DB (array -> comma-separated string)
const formatRolesForDB = (role) => {
    if (Array.isArray(role)) {
        return role.join(',');
    }
    return role;
};

// Helper to format roles for Response (comma-separated string -> array)
const formatRolesFromDB = (roleStr) => {
    if (!roleStr) return [];
    return roleStr.includes(',') ? roleStr.split(',') : [roleStr];
};

// Ensure authentication
router.use(authenticateToken);

// Get all users (Admins only)
router.get('/', authorizeRole(['Administrator', 'All']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.role, u.email, u.created_at,
            (SELECT MAX(created_at) FROM audit_logs WHERE user_id = u.id) as last_active,
            (SELECT COUNT(*) > 0 FROM user_sessions WHERE user_id = u.id AND expires_at > NOW()) as is_logged_in
            FROM users u
            ORDER BY u.created_at DESC
        `);

        // Transform roles to array
        const users = result.rows.map(u => ({
            ...u,
            role: formatRolesFromDB(u.role)
        }));

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user (Admins only)
router.post('/', authorizeRole(['Administrator', 'All']), async (req, res) => {
    const { username, password, role, email } = req.body;

    if (!username || !role || !email) {
        return res.status(400).json({ error: 'Missing required fields (username, role, email)' });
    }

    if (!validateRoles(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const dbRole = formatRolesForDB(role);

    // Generate random password if not provided
    const generatedPassword = password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (username, password, role, email, must_change_password) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, email, created_at',
            [username, hashedPassword, dbRole, email, true]
        );

        // Send Welcome Email
        // Send Welcome Email (Async - don't wait for it)
        import('../utils/email.js').then(({ sendWelcomeEmail }) => {
            sendWelcomeEmail(email, username, generatedPassword).catch(err => {
                console.error('Failed to send welcome email (async):', err);
            });
        }).catch(err => {
            console.error('Failed to import email utils:', err);
        });

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_USER', `Created user ${username} with role ${dbRole}`, 'USER', result.rows[0].id]
        );

        const newUser = result.rows[0];
        newUser.role = formatRolesFromDB(newUser.role);
        // Return the generated password so the admin can give it to the user if email fails
        newUser.temporaryPassword = generatedPassword;

        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { role, password, username, email } = req.body;

    // Authorization Check: Admin or Self
    // Check if user has admin privileges (handling both standard and comma-separated roles from token)
    const userRoles = req.user.role.includes(',') ? req.user.role.split(',') : [req.user.role];
    const isAdmin = userRoles.includes('Administrator') || userRoles.includes('All');

    if (!isAdmin && req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Only Admin can change roles
    if (role && !isAdmin) {
        return res.status(403).json({ error: 'Only Administrators can change roles' });
    }

    if (role && !validateRoles(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        let query = 'UPDATE users SET ';
        const values = [];
        let index = 1;

        if (role) {
            query += `role = $${index}, `;
            values.push(formatRolesForDB(role));
            index++;
        }

        if (username) {
            query += `username = $${index}, `;
            values.push(username);
            index++;
        }

        if (email) {
            query += `email = $${index}, `;
            values.push(email);
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
        query += ` WHERE id = $${index} RETURNING id, username, role, email`;
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

        const updatedUser = result.rows[0];
        updatedUser.role = formatRolesFromDB(updatedUser.role);

        res.json(updatedUser);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user (Admins only)
router.delete('/:id', authorizeRole(['Administrator', 'All']), async (req, res) => {
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

import multer from 'multer';
import baseUpload from '../utils/upload.js';

// Configure Multer for profile photo (using memory storage for DB persistence)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Increase limit to 10MB
    fileFilter: (req, file, cb) => {
        // Allow any file that is an image
        if (file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Upload profile photo
router.post('/:id/photo', (req, res, next) => {
    console.log(`[DEBUG] Received photo upload request for user ${req.params.id}`);
    next();
}, upload.single('photo'), async (req, res) => {
    const { id } = req.params;

    // Authorization Check: Admin or Self
    const isAdmin = ['Administrator', 'All'].includes(req.user.role);
    if (!isAdmin && req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Insert into file_storage
        const fileRes = await pool.query(
            `INSERT INTO file_storage (filename, mime_type, data, size) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [req.file.originalname, req.file.mimetype, req.file.buffer, req.file.size]
        );
        const fileId = fileRes.rows[0].id;

        // Use the generic file view endpoint
        // NOTE: Frontend needs to handle this new URL format
        const photoUrl = `/api/files/view/${fileId}`;

        const updateResult = await pool.query(
            'UPDATE users SET photo_url = $1 WHERE id = $2',
            [photoUrl, id]
        );

        res.json({ photoUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        // Helper to get formatted error
        res.status(500).json({ error: 'Upload failed: ' + (error.message || 'Unknown error') });
    }
});

// Remove profile photo
router.delete('/:id/photo', async (req, res) => {
    const { id } = req.params;

    // Authorization Check: Admin or Self
    const isAdmin = ['Administrator', 'All'].includes(req.user.role);
    if (!isAdmin && req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        await pool.query('UPDATE users SET photo_url = NULL WHERE id = $1', [id]);
        res.json({ message: 'Photo removed successfully' });
    } catch (error) {
        console.error('Error removing photo:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
