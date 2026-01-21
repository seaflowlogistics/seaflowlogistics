
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all containers (derived from shipments)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, sort, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Base Query
        let query = `
            SELECT 
                s.id as job_id,
                s.created_at as job_created_at,
                s.container_no,
                s.receiver_name as consignee,
                s.sender_name as exporter,
                cs.clearance_date,
                dn.id as delivery_note_id,
                dn.status as delivery_note_status
            FROM shipments s
            LEFT JOIN clearance_schedules cs ON s.id = cs.job_id
            LEFT JOIN delivery_notes dn ON s.id = dn.shipment_id
            WHERE s.container_no IS NOT NULL AND s.container_no != ''
        `;

        const params = [];

        // Search
        if (search) {
            query += ` AND (
                s.container_no ILIKE $${params.length + 1} OR 
                s.receiver_name ILIKE $${params.length + 1} OR 
                s.sender_name ILIKE $${params.length + 1} OR 
                s.id ILIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }

        // Sorting
        // Default sort by created_at DESC
        query += ` ORDER BY s.created_at DESC`;

        // Pagination
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) 
            FROM shipments s
            WHERE s.container_no IS NOT NULL AND s.container_no != ''
        `;
        const countParams = [];
        if (search) {
            countQuery += ` AND (
                s.container_no ILIKE $${countParams.length + 1} OR 
                s.receiver_name ILIKE $${countParams.length + 1} OR 
                s.sender_name ILIKE $${countParams.length + 1} OR 
                s.id ILIKE $${countParams.length + 1}
            )`;
            countParams.push(`%${search}%`);
        }
        const countResult = await pool.query(countQuery, countParams);
        const totalRecords = parseInt(countResult.rows[0].count, 10);

        res.json({
            data: result.rows,
            total: totalRecords,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: Math.ceil(totalRecords / limit)
        });

    } catch (error) {
        console.error('Error fetching containers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
