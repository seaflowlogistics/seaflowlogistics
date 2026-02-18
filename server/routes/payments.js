import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { broadcastNotification, broadcastToAll, createNotification } from '../utils/notify.js';

const router = express.Router();

// Get all payments (with search/pagination)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
        const offset = (pageNumber - 1) * limitNumber;

        let query = `
            SELECT jp.*, u.username as requested_by_name, pu.username as processed_by_name, s.customer
            FROM job_payments jp
            LEFT JOIN users u ON jp.requested_by = u.id
            LEFT JOIN users pu ON jp.processed_by = pu.id
            LEFT JOIN shipments s ON jp.job_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            if (status.includes(',')) {
                const statuses = status.split(',');
                query += ` AND jp.status = ANY($${params.length + 1}::text[])`;
                params.push(statuses);
            } else {
                query += ` AND jp.status = $${params.length + 1}`;
                params.push(status);
            }
        }

        if (search) {
            query += ` AND (
                jp.job_id ILIKE $${params.length + 1} OR
                jp.vendor ILIKE $${params.length + 1} OR
                jp.payment_type ILIKE $${params.length + 1} OR
                jp.bill_ref_no ILIKE $${params.length + 1} OR
                s.customer ILIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY jp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limitNumber, offset);

        // Count for pagination
        let countQuery = `
            SELECT COUNT(*) 
            FROM job_payments jp
            LEFT JOIN shipments s ON jp.job_id = s.id
            WHERE 1=1
        `;
        const countParams = [];

        if (status) {
            if (status.includes(',')) {
                const statuses = status.split(',');
                countQuery += ` AND jp.status = ANY($${countParams.length + 1}::text[])`;
                countParams.push(statuses);
            } else {
                countQuery += ` AND jp.status = $${countParams.length + 1}`;
                countParams.push(status);
            }
        }

        if (search) {
            countQuery += ` AND (
                jp.job_id ILIKE $${countParams.length + 1} OR
                jp.vendor ILIKE $${countParams.length + 1} OR
                jp.payment_type ILIKE $${countParams.length + 1} OR
                jp.bill_ref_no ILIKE $${countParams.length + 1} OR
                s.customer ILIKE $${countParams.length + 1}
            )`;
            countParams.push(`%${search}%`);
        }

        const [result, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);
        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            data: result.rows,
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber)
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request Payment Confirmation (Accountant -> Clearance)
router.post('/request-confirmation', authenticateToken, async (req, res) => {
    try {
        const { paymentIds } = req.body;

        if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({ error: 'No items selected' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update Payment Statuses
            const result = await client.query(
                "UPDATE job_payments SET status = 'Confirmation Requested' WHERE id = ANY($1) RETURNING *",
                [paymentIds]
            );

            // 2. Update Shipment Status to 'Payment Confirmation' so Clearance can see it
            const jobIds = [...new Set(result.rows.map(r => r.job_id))];
            if (jobIds.length > 0) {
                await client.query(
                    "UPDATE shipments SET status = 'Payment Confirmation' WHERE id = ANY($1)",
                    [jobIds]
                );
            }

            // 3. Audit Logs (bulk)
            if (jobIds.length > 0) {
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id)
                     SELECT $1, 'REQUEST_CONFIRMATION', 'Accountant requested confirmation for payments', 'SHIPMENT', unnest($2::text[])`,
                    [req.user.id, jobIds]
                );
            }

            await client.query('COMMIT');

            // Notify Clearance after commit
            if (jobIds.length > 0) {
                await Promise.all(jobIds.map(jId =>
                    broadcastNotification(
                        'Clearance',
                        'Payment Confirmation Requested',
                        `Please confirm payment details for Job ${jId}`,
                        'action',
                        `/registry?selectedJobId=${jId}`,
                        'SHIPMENT',
                        jId
                    )
                ));
            }
            res.json({ message: 'Confirmation requested', count: result.rowCount });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Request confirmation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payment status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const result = await pool.query(
            'UPDATE job_payments SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const updatedPayment = result.rows[0];

        // Notify Requester (e.g., Clearance) if status changed by someone else (e.g., Accountant)
        if (updatedPayment.requested_by && updatedPayment.requested_by !== req.user.id) {
            try {
                await createNotification(updatedPayment.requested_by, 'Payment Status Updated', `Payment for Job ${updatedPayment.job_id} status updated to ${status}.`, 'info', `/registry?selectedJobId=${updatedPayment.job_id}`, 'SHIPMENT', updatedPayment.job_id);
            } catch (e) { console.error(e); }
        }

        // Audit Log
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_PAYMENT_STATUS', `Updated payment status to ${status}`, 'PAYMENT', id]
        );

        // Update Job Status/Progress based on Confirmation
        if (status === 'Confirmed') {
            // If Confirmed (by Clearance), send back to Accounts (Shipment Status: 'Payment')
            // And update progress 75%
            await pool.query("UPDATE shipments SET status = 'Payment', progress = 75 WHERE id = $1", [updatedPayment.job_id]);

            // Notify Accountants
            await broadcastNotification('Accountant', 'Payment Confirmed', `Payment for Job ${updatedPayment.job_id} confirmed by Clearance.`, 'action', `/registry?selectedJobId=${updatedPayment.job_id}`, 'SHIPMENT', updatedPayment.job_id);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payment amount/details
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_type, vendor, bill_ref_no, paid_by } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        // Fetch current to merge/check
        const currentRes = await pool.query('SELECT * FROM job_payments WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
        const current = currentRes.rows[0];

        const result = await pool.query(
            `UPDATE job_payments 
             SET amount = $1,
                 payment_type = COALESCE($3, payment_type),
                 vendor = COALESCE($4, vendor),
                 bill_ref_no = COALESCE($5, bill_ref_no),
                 paid_by = COALESCE($6, paid_by)
             WHERE id = $2 
             RETURNING *`,
            [amount, id, payment_type, vendor, bill_ref_no, paid_by]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_PAYMENT', `Updated payment amount to ${amount}`, 'PAYMENT', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/job/:jobId', authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await pool.query(
            `SELECT jp.*, u.username as requested_by_name 
             FROM job_payments jp
             LEFT JOIN users u ON jp.requested_by = u.id
             WHERE jp.job_id = $1 
             ORDER BY jp.created_at DESC`,
            [jobId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new payment
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { job_id, payment_type, vendor, amount, bill_ref_no, paid_by } = req.body;
        const requested_by = req.user.id;

        if (!job_id || !payment_type || !amount || !paid_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO job_payments (job_id, payment_type, vendor, amount, bill_ref_no, paid_by, requested_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft')
             RETURNING *`,
            [job_id, payment_type, vendor, amount, bill_ref_no, paid_by, requested_by]
        );

        // Optional: Create audit log
        // Log for Job History
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'PAYMENT_REQUEST', `Payment Request created`, 'SHIPMENT', job_id]
        );


        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// No Payment Request - Creates Draft 'No Payment' record
router.post('/no-payment', authenticateToken, async (req, res) => {
    try {
        const { job_id } = req.body;
        const requested_by = req.user.id;

        if (!job_id) {
            return res.status(400).json({ error: 'Job ID is required' });
        }

        // Check if "No Payment" already exists?
        // Insert record as 'Draft'
        const result = await pool.query(
            `INSERT INTO job_payments (job_id, payment_type, vendor, amount, bill_ref_no, paid_by, requested_by, status)
             VALUES ($1, 'No Payment', 'No Payment', 0, 'N/A', 'Company', $2, 'Draft')
             RETURNING *`,
            [job_id, requested_by]
        );

        // Audit Log
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'NO_PAYMENT_DRAFT', `No Payment Draft Created`, 'SHIPMENT', job_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('No payment request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send Batch to Accounts (Update Draft -> Pending)
router.post('/send-batch', authenticateToken, async (req, res) => {
    try {
        const { paymentIds } = req.body; // Array of IDs

        if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({ error: 'No Start Payment IDs provided' });
        }

        // Validate Job Clearance Status
        // Payments can only be sent to accounts if the Job is Cleared (progress == 100)
        const validationQuery = `
            SELECT s.id, s.progress, s.status, s.customer, jp.payment_type
            FROM job_payments jp
            JOIN shipments s ON jp.job_id = s.id
            WHERE jp.id = ANY($1)
        `;
        const valRes = await pool.query(validationQuery, [paymentIds]);

        const incompleteJobs = valRes.rows.filter(job => job.progress < 100 && job.status !== 'Cleared');

        if (incompleteJobs.length > 0) {
            const names = [...new Set(incompleteJobs.map(j => `Job ${j.id} (${j.customer})`))].join(', ');
            return res.status(400).json({
                error: `Cannot send to accounts. The following jobs are not yet cleared: ${names}. Please issue Delivery Notes for all BLs first.`
            });
        }

        const result = await pool.query(
            "UPDATE job_payments SET status = (CASE WHEN payment_type = 'No Payment' THEN 'Confirm with clearance' ELSE 'Pending' END) WHERE id = ANY($1) AND status = 'Draft' RETURNING *",
            [paymentIds]
        );

        // Update Job Status to 'Payment' for related jobs
        const pendingJobs = [...new Set(valRes.rows.map(r => r.id))];
        if (pendingJobs.length > 0) {
            await pool.query(
                "UPDATE shipments SET status = 'Payment' WHERE id = ANY($1) AND status != 'Completed'",
                [pendingJobs]
            );
        }

        // Audit Logs per Job
        const jobsInBatch = [...new Set(valRes.rows.map(r => r.id))];
        if (jobsInBatch.length > 0) {
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id)
                 SELECT $1, 'SEND_PAYMENTS_TO_ACCOUNTS', 'Payment sent for approval', 'SHIPMENT', unnest($2::text[])`,
                [req.user.id, jobsInBatch]
            );
        }

        // Notify Accountants
        const isNoPayment = valRes.rows.some(r => r.payment_type === 'No Payment');

        let notifTitle = isNoPayment ? 'No Payment Request' : 'Payment Approval Request';
        let notifLink = '/payments';
        let notifMsg = `New payments have been sent for approval by ${req.user.username}.`;
        let notifEntityId = null;

        if (jobsInBatch.length === 1) {
            const jobId = jobsInBatch[0];
            notifLink = `/registry?selectedJobId=${jobId}`;
            notifMsg = isNoPayment
                ? `No payment requested for Job ${jobId} by ${req.user.username}.`
                : `New payments for Job ${jobId} sent for approval by ${req.user.username}.`;
            notifEntityId = jobId;
        }

        try {
            await broadcastNotification('Accountant', notifTitle, notifMsg, 'action', notifLink, 'SHIPMENT', notifEntityId);
            await broadcastNotification('Administrator', notifTitle, notifMsg, 'action', notifLink, 'SHIPMENT', notifEntityId);

        } catch (noteError) {
            console.error('Notification error:', noteError);
        }

        res.json({ message: 'Payments sent to accounts', updated: result.rowCount });
    } catch (error) {
        console.error('Send batch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a payment
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM job_payments WHERE id = $1', [id]);
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Process Batch Payments (Pending/Approved -> Paid)
router.post('/process-batch', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { paymentIds, comments, reference, paymentDate, paymentMode } = req.body;
        const processed_by = req.user.id;

        if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({ error: 'No items to process' });
        }

        // Generate Voucher Number
        // VH-{YYYY}-001
        const currentYear = new Date().getFullYear();
        const prefix = `VH-${currentYear}-`;

        // Find last voucher number for this year
        const lastVoucherRes = await client.query(
            `SELECT voucher_no FROM job_payments WHERE voucher_no LIKE $1 ORDER BY voucher_no DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let sequence = 1;
        if (lastVoucherRes.rows.length > 0 && lastVoucherRes.rows[0].voucher_no) {
            const lastNo = lastVoucherRes.rows[0].voucher_no;
            const parts = lastNo.split('-');
            if (parts.length === 3) {
                sequence = parseInt(parts[2], 10) + 1;
            }
        }

        const voucherNo = `${prefix}${String(sequence).padStart(3, '0')}`;

        // Update Payments
        // We assume all selected payments get the SAME voucher number if processed together? 
        // Requests usually imply a single "Payment Voucher" for a batch to a vendor.
        const query = `
            UPDATE job_payments 
            SET status = 'Paid',
                voucher_no = $1,
                bill_ref_no = $2,
                paid_at = $3,
                payment_mode = $4,
                comments = $5,
                processed_by = $6,
                updated_at = NOW()
            WHERE id = ANY($7)
            RETURNING *
        `;

        const result = await client.query(query, [
            voucherNo,
            reference,
            paymentDate,
            paymentMode,
            comments,
            processed_by,
            paymentIds
        ]);

        // Check for Job Completion
        const distinctJobIds = [...new Set(result.rows.map(p => p.job_id))];
        const completedJobs = [];

        if (distinctJobIds.length > 0) {
            const pendingRes = await client.query(
                `SELECT job_id, COUNT(*) FILTER (WHERE status != 'Paid') as pending
                 FROM job_payments
                 WHERE job_id = ANY($1)
                 GROUP BY job_id`,
                [distinctJobIds]
            );

            const pendingMap = new Map();
            pendingRes.rows.forEach(r => {
                pendingMap.set(r.job_id, parseInt(r.pending, 10));
            });

            const allPaidJobIds = distinctJobIds.filter(jId => (pendingMap.get(jId) || 0) === 0);

            if (allPaidJobIds.length > 0) {
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id)
                     SELECT $1, 'ALL_PAYMENTS_COMPLETED', 'All payments completed', 'SHIPMENT', unnest($2::text[])`,
                    [req.user.id, allPaidJobIds]
                );

                // 2. Update Progress to 75% (Accounts Complete)
                // We do NOT mark as 'Completed' (100%) because that requires manual confirmation of Job Invoice No.
                await client.query(
                    "UPDATE shipments SET progress = 75 WHERE id = ANY($1) AND status != 'Completed'",
                    [allPaidJobIds]
                );
            }
        }

        await client.query('COMMIT');

        // Audit Logs & Notifications (After Commit)
        for (const jId of distinctJobIds) {
            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                [processed_by, 'PAYMENT_PROCESSED', `Payments processed (Voucher: ${voucherNo})`, 'SHIPMENT', jId]
            );
        }

        // Notify Completed
        for (const job of completedJobs) {
            try {
                await broadcastToAll('Job Completed', `Job ${job.id} (${job.customer}) is now Completed.`, 'success', `/registry?selectedJobId=${job.id}`, 'SHIPMENT', job.id);
                await pool.query(
                    'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                    [req.user.id, 'JOB_COMPLETED', `Job marked as Completed`, 'SHIPMENT', job.id]
                );
            } catch (ne) { console.error(ne); }
        }


        res.json({ message: 'Payments processed successfully', data: result.rows, voucherNo });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Process batch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

export default router;
