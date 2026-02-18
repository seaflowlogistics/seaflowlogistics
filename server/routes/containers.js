
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all containers (derived from shipments)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, sort, page = 1, limit = 50 } = req.query;
        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
        const offset = (pageNumber - 1) * limitNumber;

        const baseCTE = `
            WITH all_containers AS (
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
                LEFT JOIN delivery_note_items dni ON s.id = dni.job_id
                LEFT JOIN delivery_notes dn ON dni.delivery_note_id = dn.id
                WHERE s.container_no IS NOT NULL AND s.container_no != ''

                UNION

                SELECT 
                    s.id as job_id,
                    s.created_at as job_created_at,
                    sc.container_no,
                    s.receiver_name as consignee,
                    s.sender_name as exporter,
                    cs.clearance_date,
                    dn.id as delivery_note_id,
                    dn.status as delivery_note_status
                FROM shipment_containers sc
                JOIN shipments s ON sc.shipment_id = s.id
                LEFT JOIN clearance_schedules cs ON s.id = cs.job_id
                LEFT JOIN delivery_note_items dni ON s.id = dni.job_id
                LEFT JOIN delivery_notes dn ON dni.delivery_note_id = dn.id
            )
        `;

        const params = [];
        let whereClause = "";

        if (search) {
            whereClause = `WHERE (
                container_no ILIKE $${params.length + 1} OR 
                consignee ILIKE $${params.length + 1} OR 
                exporter ILIKE $${params.length + 1} OR 
                job_id ILIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }

        // Data Query
        const query = `
            ${baseCTE}
            SELECT * FROM all_containers
            ${whereClause}
            ORDER BY job_created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        // Count Query params (don't include limit/offset)
        const countParams = [...params];

        // Add limit/offset to data params
        const dataParams = [...params, limitNumber, offset];

        // Count Query
        const countQuery = `
            ${baseCTE}
            SELECT COUNT(*) FROM all_containers
            ${whereClause}
        `;

        const [result, countResult] = await Promise.all([
            pool.query(query, dataParams),
            pool.query(countQuery, countParams)
        ]);
        const totalRecords = parseInt(countResult.rows[0].count, 10);

        res.json({
            data: result.rows,
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalRecords / limitNumber)
        });

    } catch (error) {
        console.error('Error fetching containers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
