import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

const writeAccessRoles = ['Administrator', 'Clearance', 'Clearance - Office', 'All'];

// Create a new clearance schedule
router.post('/', authorizeRole(writeAccessRoles), async (req, res) => {
    try {
        console.log('Creating clearance schedule:', req.body);
        const { job_id, date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, container_no, container_type, delivery_contact_name, delivery_contact_phone } = req.body;

        if (!job_id || !date) {
            return res.status(400).json({ error: 'Job ID and Date are required' });
        }

        const result = await pool.query(
            `INSERT INTO clearance_schedules (job_id, clearance_date, clearance_type, port, bl_awb, transport_mode, remarks, packages, clearance_method, container_no, container_type, delivery_contact_name, delivery_contact_phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [job_id, date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, container_no, container_type, delivery_contact_name, delivery_contact_phone]
        );

        const schedule = result.rows[0];

        // Audit Log
        await logActivity(
            req.user.id,
            'CREATE_CLEARANCE_SCHEDULE',
            `Scheduled clearance for Job ${job_id} on ${date}`,
            'clearance_schedules',
            schedule.id
        );

        // Update Job Status to 'Pending' if it's currently 'New'
        await pool.query("UPDATE shipments SET status = 'Pending' WHERE id = $1 AND status = 'New'", [job_id]);

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Error creating clearance schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a clearance schedule
router.put('/:id', authorizeRole(writeAccessRoles), async (req, res) => {
    try {
        const { id } = req.params;
        const { date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, reschedule_reason, container_no, container_type, delivery_contact_name, delivery_contact_phone } = req.body;

        const result = await pool.query(
            `UPDATE clearance_schedules 
             SET clearance_date = $1, clearance_type = $2, port = $3, bl_awb = $4, transport_mode = $5, remarks = $6, packages = $7, clearance_method = $8, reschedule_reason = $9, container_no = $10, container_type = $11, delivery_contact_name = $12, delivery_contact_phone = $13
             WHERE id = $14
             RETURNING *`,
            [date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, reschedule_reason, container_no, container_type, delivery_contact_name, delivery_contact_phone, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Clearance schedule not found' });
        }

        const schedule = result.rows[0];

        // Audit Log
        await logActivity(
            req.user.id,
            'UPDATE_CLEARANCE_SCHEDULE',
            `Updated clearance schedule for Job ${schedule.job_id}`,
            'clearance_schedules',
            schedule.id
        );

        res.json(schedule);
    } catch (error) {
        console.error('Error updating clearance schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

// Get all clearance schedules (with filters)
router.get('/', async (req, res) => {
    try {
        const { search, type, transport_mode, date } = req.query;

        let query = `
            SELECT cs.*, 
                   s.customer, 
                   s.sender_name as exporter, 
                   s.receiver_name as consignee,
                   s.transport_mode as shipment_transport_mode,
                   c.c_number
            FROM clearance_schedules cs
            JOIN shipments s ON cs.job_id = s.id
            LEFT JOIN consignees c ON REGEXP_REPLACE(LOWER(c.name), '[^a-z0-9]', '', 'g') = REGEXP_REPLACE(LOWER(s.receiver_name), '[^a-z0-9]', '', 'g')
        `;

        const params = [];
        const conditions = [];

        // Exclude schedules that are already linked to a Delivery Note (and thus "transferred")
        conditions.push(`cs.id NOT IN (SELECT schedule_id FROM delivery_note_items WHERE schedule_id IS NOT NULL)`);

        if (search) {
            const i = params.length + 1;
            conditions.push(`(
                cs.job_id ILIKE $${i} OR 
                s.customer ILIKE $${i} OR 
                s.sender_name ILIKE $${i} OR 
                cs.bl_awb ILIKE $${i} OR
                cs.port ILIKE $${i}
            )`);
            params.push(`%${search}%`);
        }

        if (type && type !== 'All types') {
            params.push(type);
            conditions.push(`cs.clearance_type = $${params.length}`);
        }

        if (transport_mode && transport_mode !== 'All modes') {
            params.push(transport_mode);
            conditions.push(`cs.transport_mode = $${params.length}`);
        }

        if (date) {
            params.push(date);
            conditions.push(`cs.clearance_date = $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY cs.clearance_date ASC';

        const result = await pool.query(query, params);
        let rows = result.rows;

        // Post-processing: Fuzzy match for missing C-Numbers
        // Only fetch consignees if we have rows with missing c_number
        const missingCNumRows = rows.filter(r => !r.c_number && r.consignee);

        if (missingCNumRows.length > 0) {
            const consigneesRes = await pool.query('SELECT name, c_number FROM consignees');
            const consignees = consigneesRes.rows;

            rows = rows.map(row => {
                if (!row.c_number && row.consignee) {
                    const targetName = row.consignee.toLowerCase().replace(/[^a-z0-9]/g, '');

                    let bestMatch = null;
                    let minDistance = Infinity;

                    for (const c of consignees) {
                        const sourceName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');

                        // Heuristic: If one contains the other, it's a very strong candidate (distance 0 effectively for inclusion)
                        if (targetName.includes(sourceName) || sourceName.includes(targetName)) {
                            // Use inclusion as a prioritization. 
                            // Just checking inclusion might be risky if "Company A" is inside "Company A Plus". 
                            // But usually acceptable. Let's calculate distance still to be sure.
                        }

                        const dist = levenshteinDistance(targetName, sourceName);

                        // Threshold logic: 
                        // Allow small typos relative to length.
                        // 1-3 chars difference is usually acceptable especially for pluralization (s) or spacing.
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestMatch = c;
                        }
                    }

                    // A threshold of 3 is generous enough for "Construction" vs "Constructions" (diff 1)
                    // and some other typos, but tight enough to avoid matching totally different names.
                    if (bestMatch && minDistance <= 3) {
                        return { ...row, c_number: bestMatch.c_number };
                    }
                }
                return row;
            });
        }

        res.json(rows);

    } catch (error) {
        console.error('Error fetching clearance schedules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a clearance schedule
router.delete('/:id', authorizeRole(writeAccessRoles), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM clearance_schedules WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const schedule = result.rows[0];

        // Audit Log
        await logActivity(
            req.user.id,
            'DELETE_CLEARANCE_SCHEDULE',
            `Deleted clearance schedule for Job ${schedule.job_id}`,
            'clearance_schedules',
            id
        );

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Error deleting clearance schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
