import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only PDF and JPEG/PNG images are allowed'));
    }
});

// Helper to generate Shipment ID
const generateShipmentId = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const prefix = `SH-${year}`;

    // Get last shipment ID for this year
    const result = await pool.query(
        "SELECT id FROM shipments WHERE id LIKE $1 ORDER BY created_at DESC LIMIT 1",
        [`${prefix}-%`]
    );

    let nextNum = 1;
    if (result.rows.length > 0) {
        const lastId = result.rows[0].id;
        const parts = lastId.split('-');
        if (parts.length === 3) {
            nextNum = parseInt(parts[2]) + 1;
        }
    }

    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
};

// Get all shipments
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = 'SELECT * FROM shipments';
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(id ILIKE $${params.length + 1} OR customer ILIKE $${params.length + 1} OR sender_name ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (status && status !== 'All') {
            conditions.push(`status = $${params.length + 1}`);
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get shipments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single shipment
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const shipmentResult = await pool.query('SELECT * FROM shipments WHERE id = $1', [id]);

        if (shipmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        const documentsResult = await pool.query('SELECT * FROM shipment_documents WHERE shipment_id = $1', [id]);

        res.json({
            ...shipmentResult.rows[0],
            documents: documentsResult.rows
        });
    } catch (error) {
        console.error('Get shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const shipmentUpload = upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'packing_list', maxCount: 1 },
    { name: 'transport_doc', maxCount: 1 }
]);

// Create new shipment
router.post('/', authenticateToken, shipmentUpload, async (req, res) => {
    try {
        const {
            sender_name, sender_address,
            receiver_name, receiver_address,
            description, weight, dimensions, price,
            date, expected_delivery_date, transport_mode,
            driver, vehicle_id
        } = req.body;

        const id = await generateShipmentId();
        const status = 'New';
        const progress = 0;

        // Map sender_name to customer and origin/destination for backward compatibility
        const customer = sender_name;
        const origin = sender_address ? sender_address.split('\n')[0] : '';
        const destination = receiver_address ? receiver_address.split('\n')[0] : '';

        // Begin transaction
        await pool.query('BEGIN');

        const shipmentQuery = `
            INSERT INTO shipments (
                id, customer, origin, destination, status, progress, 
                sender_name, sender_address, receiver_name, receiver_address,
                description, weight, dimensions, price,
                date, expected_delivery_date, transport_mode,
                driver, vehicle_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;

        const shipmentValues = [
            id, customer, origin, destination, status, progress,
            sender_name, sender_address, receiver_name, receiver_address,
            description, weight, dimensions, price,
            date, expected_delivery_date, transport_mode,
            driver || null, vehicle_id || null
        ];

        const shipmentResult = await pool.query(shipmentQuery, shipmentValues);

        // Handle File Uploads
        if (req.files) {
            const fileTypes = ['invoice', 'packing_list', 'transport_doc'];

            for (const type of fileTypes) {
                if (req.files[type]) {
                    const file = req.files[type][0];
                    await pool.query(
                        'INSERT INTO shipment_documents (shipment_id, file_name, file_path, file_type, file_size, document_type) VALUES ($1, $2, $3, $4, $5, $6)',
                        [id, file.originalname, file.path, file.mimetype, file.size, type]
                    );
                }
            }
        }

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_SHIPMENT', `Created shipment ${id}`, 'SHIPMENT', id]
        );

        await pool.query('COMMIT');

        res.status(201).json(shipmentResult.rows[0]);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Create shipment error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Update shipment
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status, progress, driver, vehicle_id,
            sender_name, sender_address,
            receiver_name, receiver_address,
            description, weight, dimensions, price,
            date, expected_delivery_date, transport_mode
        } = req.body;

        const result = await pool.query(
            `UPDATE shipments 
             SET status = COALESCE($1, status), 
                 progress = COALESCE($2, progress), 
                 driver = COALESCE($3, driver), 
                 vehicle_id = COALESCE($4, vehicle_id),
                 sender_name = COALESCE($5, sender_name),
                 sender_address = COALESCE($6, sender_address),
                 receiver_name = COALESCE($7, receiver_name),
                 receiver_address = COALESCE($8, receiver_address),
                 description = COALESCE($9, description),
                 weight = COALESCE($10, weight),
                 dimensions = COALESCE($11, dimensions),
                 price = COALESCE($12, price),
                 date = COALESCE($13, date),
                 expected_delivery_date = COALESCE($14, expected_delivery_date),
                 transport_mode = COALESCE($15, transport_mode),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $16
             RETURNING *`,
            [
                status, progress, driver, vehicle_id,
                sender_name, sender_address, receiver_name, receiver_address,
                description, weight, dimensions, price,
                date, expected_delivery_date, transport_mode,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_SHIPMENT', `Updated shipment ${id}`, 'SHIPMENT', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete shipment
router.delete('/:id', authenticateToken, authorizeRole(['Administrator', 'Clearance Manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM shipments WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        res.json({ message: 'Shipment deleted successfully' });

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'DELETE_SHIPMENT', `Deleted shipment ${id}`, 'SHIPMENT', id]
        );
    } catch (error) {
        console.error('Delete shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
