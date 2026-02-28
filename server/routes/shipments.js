
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import baseUpload from '../utils/upload.js';
import path from 'path';
import fs from 'fs';
import { generateInvoicePDF } from '../utils/invoiceGenerator.js';
import XLSX from 'xlsx';
import { logActivity } from '../utils/logger.js';
import { broadcastNotification, createNotification, broadcastToAll } from '../utils/notify.js';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { uploadToSupabase } from '../utils/supabaseStorage.js';
import { supabase } from '../config/supabase.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const router = express.Router();

const upload = multer({
    storage: baseUpload.storage, // Use storage from our central utility
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Updated regex to allow xlxs, xls, csv for imports AND images/pdf for docs
        const allowedTypes = /jpeg|jpg|png|pdf|xlsx|xls|csv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        // checks mimetype but mimetype for excel can varies, so mostly relying on extension for excel
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Allowed: PDF, Images, Excel, CSV'));
    }
});

// Helper to generate Shipment ID
const generateShipmentId = async (transportMode) => {
    const date = new Date();
    const year = date.getFullYear();
    const prefixChar = (transportMode === 'SEA') ? 'S' : 'A';
    // Matches specific prefixes S2026-... and A2026-...
    const sPattern = `S${year}-%`;
    const aPattern = `A${year}-%`;

    // Calculate max sequence directly in the database
    const result = await pool.query(
        `SELECT MAX(CAST(SUBSTRING(id FROM '-([0-9]+)$') AS INTEGER)) as max_num
         FROM shipments 
         WHERE id LIKE $1 OR id LIKE $2`,
        [sPattern, aPattern]
    );

    const maxNum = result.rows[0]?.max_num || 0;
    const nextNum = maxNum + 1;

    return `${prefixChar}${year}-${String(nextNum).padStart(4, '0')}`;
};

// Export Shipments (Full Details)
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT
                s.id as "Job ID",
                s.customer as "Customer",
                s.receiver_name as "Consignee",
                s.billing_contact as "Billing Contact",
                s.service as "Service",
                s.sender_name as "Exporter",
                s.invoice_no as "Shipment Invoice No",
                s.invoice_items as "Invoice Items",
                s.customs_r_form as "Customs R Form",
                -- Aggregated BLs
                (SELECT STRING_AGG(master_bl, ', ') FROM shipment_bls WHERE shipment_id = s.id) as "BL/AWB Number",
                -- Aggregated Containers
                (SELECT STRING_AGG(container_no, ', ') FROM shipment_containers WHERE shipment_id = s.id) as "Container Number",
                (SELECT STRING_AGG(container_type, ', ') FROM shipment_containers WHERE shipment_id = s.id) as "Container Type",

                (SELECT CASE WHEN SUM(NULLIF(REPLACE(substring(p->>'cbm' from '[0-9,.]+'), ',', ''), '')::numeric) IS NULL THEN '-' ELSE TO_CHAR(SUM(NULLIF(REPLACE(substring(p->>'cbm' from '[0-9,.]+'), ',', ''), '')::numeric), 'FM999G999G999D000') END
  FROM shipment_bls sb
  CROSS JOIN LATERAL jsonb_array_elements(sb.packages::jsonb) AS c
  CROSS JOIN LATERAL jsonb_array_elements(c->'packages') AS p
  WHERE sb.shipment_id = s.id
) AS "CBM",

-- Weight (sum over all nested packages)
(
  SELECT
    CASE
      WHEN SUM(NULLIF(REPLACE(substring(p->>'weight' from '[0-9,.]+'), ',', ''), '')::numeric) IS NULL THEN '-'
      ELSE TO_CHAR(SUM(NULLIF(REPLACE(substring(p->>'weight' from '[0-9,.]+'), ',', ''), '')::numeric), 'FM999G999G999D00')
    END
  FROM shipment_bls sb
  CROSS JOIN LATERAL jsonb_array_elements(sb.packages::jsonb) AS c
  CROSS JOIN LATERAL jsonb_array_elements(c->'packages') AS p
  WHERE sb.shipment_id = s.id
) AS "Weight",

-- Packages (sum pkg_count grouped by pkg_type, output like: "2 PKG, 2000 CARTONS")
(
  SELECT
    COALESCE(
      STRING_AGG(
        (tot.total_count)::text || ' ' || tot.pkg_type,
        ', '
        ORDER BY tot.pkg_type
      ),
      '-'
    )
  FROM (
    SELECT
      p->>'pkg_type' AS pkg_type,
      SUM(NULLIF(REPLACE(substring(p->>'pkg_count' from '[0-9,.]+'), ',', ''), '')::numeric) AS total_count
    FROM shipment_bls sb
    CROSS JOIN LATERAL jsonb_array_elements(sb.packages::jsonb) AS c
    CROSS JOIN LATERAL jsonb_array_elements(c->'packages') AS p
    WHERE sb.shipment_id = s.id
    GROUP BY p->>'pkg_type'
  ) tot
) AS "Packages",
                -- Clearing Status
                s.status as "Clearing Status",
                -- Cleared Date (Issued Delivery Note Date)
                (
                    SELECT TO_CHAR(dn.created_at, 'YYYY-MM-DD')
                    FROM delivery_notes dn
                    JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
                    WHERE dni.job_id = s.id
                    ORDER BY dn.created_at DESC
                    LIMIT 1
                ) as "Cleared Date",
                -- Job Invoice No from invoices table
                (SELECT id FROM invoices WHERE shipment_id = s.id LIMIT 1) as "Job Invoice No",
                -- Expenses
                s.expense_macl as "MACL",
                s.expense_mpl as "MPL",
                s.expense_mcs as "MCS",
                s.expense_transportation as "Transportation",
                s.expense_liner as "Liner"

            FROM shipments s
            ORDER BY s.created_at DESC
        `;

        const result = await pool.query(query);
        const rows = result.rows;

        console.log(`Exporting ${rows.length} rows`);
        res.json(rows);

    } catch (error) {
        console.error('Export error FULL:', error);
        res.status(500).json({ error: 'Export failed: ' + error.message });
    }
});

// Import Shipments from Excel/CSV (Matches Export Format)
router.post('/import', authenticateToken, authorizeRole(['Administrator', 'All', 'Documentation']), upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Use default header parsing (Keys will be the header row strings)
        const data = XLSX.utils.sheet_to_json(sheet); // Defaults to header at row 0

        // Remove the uploaded file after parsing
        fs.unlinkSync(filePath);

        const importedShipments = [];
        let successCount = 0;
        let failureCount = 0;
        let errors = [];

        // Pre-calculate IDs to avoid N+1 Selects
        const date = new Date();
        const year = date.getFullYear();
        const sPattern = `S${year}-%`;
        const aPattern = `A${year}-%`;

        const lastIdResult = await pool.query(
            `SELECT MAX(CAST(SUBSTRING(id FROM '-([0-9]+)$') AS INTEGER)) as max_num
             FROM shipments 
             WHERE id LIKE $1 OR id LIKE $2`,
            [sPattern, aPattern]
        );

        let maxNum = lastIdResult.rows[0]?.max_num || 0;
        let nextIdNum = maxNum + 1;

        await pool.query('BEGIN');

        for (const row of data) {
            try {
                // Normalize keys to lowercase for easier matching
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toLowerCase().trim()] = row[key];
                });

                // --- 1. Identify Shipment ID ---
                let id = normalizedRow['job id'] || normalizedRow['id'] || normalizedRow['shipment no'];

                // Transport Mode (Default SEA)
                // Try to infer from ID char if valid, else default
                let transportMode = 'SEA';
                if (id && id.startsWith('A')) transportMode = 'AIR';

                // If no ID, generate one
                if (!id) {
                    const prefixChar = (transportMode === 'SEA') ? 'S' : 'A';
                    id = `${prefixChar}${year}-${String(nextIdNum).padStart(3, '0')}`;
                    nextIdNum++;
                }

                // --- 2. Map Basic Fields & Calculate Status/Progress ---
                const customer = normalizedRow['customer'] || normalizedRow['client'] || 'Unknown';
                const consignee = normalizedRow['consignee'] || normalizedRow['receiver_name'] || normalizedRow['receiver'] || 'Unknown';
                const billingContact = normalizedRow['billing contact'] || normalizedRow['billing_contact'] || consignee || 'Unknown';
                const exporter = normalizedRow['exporter'] || normalizedRow['sender_name'] || 'Unknown';
                const service = normalizedRow['service'] || 'Clearance';
                const shipmentInvoiceNo = normalizedRow['shipment invoice no'] || normalizedRow['invoice_no'];
                const invoiceItems = normalizedRow['invoice items'] || normalizedRow['invoice_items'];
                const customsRForm = normalizedRow['customs r form'] || normalizedRow['customs_r_form'];
                const jobInvoiceNo = normalizedRow['job invoice no'] || normalizedRow['job_invoice_no'];

                let status = normalizedRow['clearing status'] || normalizedRow['status'] || 'New';
                let progress = 0;

                // Status & Progress Mapping Logic
                if (status.toLowerCase() === 'completed') {
                    status = 'Completed';
                    progress = 100;
                } else if (status.toLowerCase() === 'pending' || status.toLowerCase() === 'payment') {
                    // User Request: "Pending" imports should be at 75% (Payment Phase)
                    status = 'Payment';
                    progress = 75;
                } else if (status.toLowerCase() === 'cleared') {
                    status = 'Cleared';
                    progress = 50;
                } else if (status.toLowerCase().includes('clearance')) {
                    status = 'Pending Clearance';
                    progress = 25;
                } else {
                    status = 'New';
                    progress = 0;
                }

                // Date Parsing
                let dateVal = new Date();
                const rawDate = normalizedRow['date'] || normalizedRow['clearance date'] || normalizedRow['eta'];
                if (rawDate) {
                    if (typeof rawDate === 'number') {
                        dateVal = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                    } else if (typeof rawDate === 'string') {
                        if (rawDate.includes('.')) { // DD.MM.YYYY
                            const parts = rawDate.split('.');
                            if (parts.length === 3) dateVal = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        } else {
                            dateVal = new Date(rawDate);
                        }
                    }
                }

                // Expenses
                const macl = parseFloat(normalizedRow['macl'] || '0');
                const mpl = parseFloat(normalizedRow['mpl'] || '0');
                const mcs = parseFloat(normalizedRow['mcs'] || '0');
                const transport = parseFloat(normalizedRow['transportation'] || '0');
                const liner = parseFloat(normalizedRow['liner'] || '0');

                // Check if shipment exists
                const existingCheck = await pool.query('SELECT id FROM shipments WHERE id = $1', [id]);
                const isUpdate = existingCheck.rows.length > 0;

                if (isUpdate) {
                    // UPDATE basic fields
                    await pool.query(
                        `UPDATE shipments SET 
                            customer = $1, receiver_name = $2, sender_name = $3, exporter = $3, invoice_no = $4, invoice_items = $5, 
                            customs_r_form = $6, status = $7, progress = $8,
                            expense_macl = $9, expense_mpl = $10, expense_mcs = $11,
                            expense_transportation = $12, expense_liner = $13,
                            billing_contact = $14,
                            service = $15,
                            date = $16
                         WHERE id = $17`,
                        [customer, consignee, exporter, shipmentInvoiceNo, invoiceItems,
                            customsRForm, status, progress,
                            macl, mpl, mcs, transport, liner,
                            billingContact,
                            service,
                            dateVal,
                            id]
                    );
                } else {
                    // INSERT new shipment
                    await pool.query(
                        `INSERT INTO shipments (
                            id, customer, receiver_name, sender_name, exporter, invoice_no, invoice_items, 
                            customs_r_form, status, progress,
                            expense_macl, expense_mpl, expense_mcs, 
                            expense_transportation, expense_liner, 
                            billing_contact, service, transport_mode, date, created_at, created_by
                        ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19)`,
                        [id, customer, consignee, exporter, shipmentInvoiceNo, invoiceItems,
                            customsRForm, status, progress,
                            macl, mpl, mcs, transport, liner,
                            billingContact, service, transportMode, dateVal, req.user.id]
                    );
                }

                // --- 3. Handle BL/AWB & Packages & Containers ---
                // The export format aggregates BLs, Containers, and Packages.
                // We will try to reconstruct a SINGLE Master BL entry with the details provided.
                // A more complex import would require multiple rows per shipment or complex parsing.
                // Here we assume 1 main BL per row for simplicity, or we skip if data is missing.

                const blNumber = normalizedRow['bl/awb number'];
                const containerNumbers = normalizedRow['container number']; // "CONT1, CONT2"
                const containerTypes = normalizedRow['container type'];     // "FCL 20, FCL 40"
                const cbmStr = normalizedRow['cbm'];
                const weightStr = normalizedRow['weight'];
                const packagesStr = normalizedRow['packages']; // "10 PKG, 20 BOX"

                if (blNumber) {
                    // Remove existing BLs/Containers to do a clean replace? 
                    // Or Upsert? Replacing is safer for sync behavior requested("update tables").
                    // CAUTION: This deletes existing data for the shipment.
                    await pool.query('DELETE FROM shipment_bls WHERE shipment_id = $1', [id]);
                    await pool.query('DELETE FROM shipment_containers WHERE shipment_id = $1', [id]);

                    // Construct Packages Array
                    let packagesList = [];
                    // Parse "10 PKG, 20 BOX"
                    if (packagesStr && packagesStr !== '-') {
                        const parts = packagesStr.split(',');
                        parts.forEach(part => {
                            const match = part.trim().match(/^(\d+)\s+(.+)$/);
                            if (match) {
                                packagesList.push({
                                    pkg_count: match[1],
                                    pkg_type: match[2], // e.g. "PKG" or "CARTONS"
                                    cbm: '', // Distribute CBM/Weight? Hard to guess.
                                    weight: ''
                                });
                            }
                        });
                    }
                    if (packagesList.length === 0) {
                        // Default if regex fails but data exists
                        packagesList.push({ pkg_count: '0', pkg_type: 'PKG', cbm: '', weight: '' });
                    }

                    // Assign CBM/Weight to the first package as a fallback store
                    if (packagesList.length > 0) {
                        if (cbmStr && cbmStr !== '-') packagesList[0].cbm = cbmStr.toString();
                        if (weightStr && weightStr !== '-') packagesList[0].weight = weightStr.toString();
                    }

                    // Handle Containers
                    let containersData = [];
                    if (containerNumbers && containerNumbers !== '-') {
                        const cNos = containerNumbers.split(',').map(s => s.trim());
                        const cTypes = (containerTypes || '').split(',').map(s => s.trim());

                        cNos.forEach((cNo, idx) => {
                            const cType = cTypes[idx] || 'FCL 20'; // Default
                            // We put all packages in the FIRST container for simplicity, 
                            // OR split them? Splitting is impossible without more data.
                            // Strategy: Put full package list in first container, empty in others.
                            const cPkgs = (idx === 0) ? packagesList : [];

                            containersData.push({
                                container_no: cNo,
                                container_type: cType,
                                packages: cPkgs
                            });
                        });
                    }

                    // 1. Insert BL
                    // We store the FULL structure in the BL 'packages' column for safe keeping
                    // If containers exist, we store them inside the 'packages' column as content (same as `routes/shipments.js` line 573 logic)
                    const blContent = (containersData.length > 0) ? JSON.stringify(containersData) : JSON.stringify(packagesList);

                    await pool.query(
                        'INSERT INTO shipment_bls (shipment_id, master_bl, packages) VALUES ($1, $2, $3)',
                        [id, String(blNumber).split(',')[0].trim(), blContent] // Take first BL if comma separated
                    );

                    // 2. Insert Containers (Real Tables)
                    for (const c of containersData) {
                        await pool.query(
                            'INSERT INTO shipment_containers (shipment_id, container_no, container_type, packages) VALUES ($1, $2, $3, $4)',
                            [id, c.container_no, c.container_type, JSON.stringify(c.packages)]
                        );
                    }
                }

                // --- 4. Handle Invoice ---
                try {
                    const existingInvoice = await pool.query('SELECT id FROM invoices WHERE shipment_id = $1', [id]);
                    const priceVal = parseFloat(normalizedRow['price'] || normalizedRow['value'] || normalizedRow['amount'] || '0');

                    if (existingInvoice.rows.length > 0) {
                        // Invoice exists. 
                        // If user provided a specific Job Invoice No in excel, try to update the existing invoice ID to match it.
                        if (jobInvoiceNo && existingInvoice.rows[0].id !== jobInvoiceNo) {
                            await pool.query('UPDATE invoices SET id = $1 WHERE shipment_id = $2', [jobInvoiceNo, id]);
                        }
                    } else {
                        // Create New Invoice
                        let invoiceId = jobInvoiceNo;
                        if (!invoiceId) {
                            // Generate strictly unique ID if possible, or random fallback
                            invoiceId = `INV-${new Date().getFullYear()}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
                        }

                        await pool.query(
                            'INSERT INTO invoices (id, shipment_id, amount, status) VALUES ($1, $2, $3, $4)',
                            [invoiceId, id, priceVal, 'Pending']
                        );
                    }
                } catch (invErr) {
                    // Non-fatal error (e.g. duplicate invoice ID), just log it
                    console.warn(`Invoice processing error for Shipment ${id}:`, invErr.message);
                }

                importedShipments.push(id);
                successCount++;

            } catch (rowError) {
                console.error('Error importing row:', row, rowError);
                failureCount++;
                errors.push(`Row error: ${rowError.message}`);
            }
        }

        await pool.query('COMMIT');

        // Log Action
        await logActivity(req.user.id, 'IMPORT_SHIPMENTS', `Imported ${successCount} shipments`, 'BATCH', 'EXCEL');

        res.json({
            message: 'Import processed',
            success: successCount,
            failed: failureCount,
            errors: errors.length > 0 ? errors : undefined,
            imported_ids: importedShipments
        });

    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await pool.query('ROLLBACK');
        console.error('Excel Import Error:', err);
        res.status(500).json({ error: 'Internal server error during import: ' + err.message });
    }
});

// Get all shipments
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT s.*, 
            i.id as invoice_id, 
            i.status as payment_status,
            i.created_at as invoice_date,
            (
                SELECT json_agg(sb) FROM shipment_bls sb WHERE sb.shipment_id = s.id
            ) as bls,
            (
                SELECT json_agg(sc) FROM shipment_containers sc WHERE sc.shipment_id = s.id
            ) as containers,
            (
                SELECT dn.created_at 
                FROM delivery_notes dn 
                JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id 
                WHERE dni.job_id = s.id 
                ORDER BY dn.created_at ASC 
                LIMIT 1
                
            ) as cleared_at,
            u_creator.photo_url as creator_photo,
            u_creator.username as creator_name
            FROM shipments s
            LEFT JOIN invoices i ON s.id = i.shipment_id
            LEFT JOIN users u_creator ON s.created_by = u_creator.id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(
                s.id ILIKE $${params.length + 1} 
                OR s.customer ILIKE $${params.length + 1} 
                OR s.sender_name ILIKE $${params.length + 1}
                OR s.exporter ILIKE $${params.length + 1}
                OR s.receiver_name ILIKE $${params.length + 1}
                OR s.invoice_no ILIKE $${params.length + 1}
                OR s.customs_r_form ILIKE $${params.length + 1}
                OR i.id ILIKE $${params.length + 1}
                OR EXISTS (SELECT 1 FROM shipment_bls sb WHERE sb.shipment_id = s.id AND sb.master_bl ILIKE $${params.length + 1})
            )`);
            params.push(`%${search}%`);
        }

        if (status && status !== 'All') {
            conditions.push(`s.status = $${params.length + 1}`);
            params.push(status);
        } else if (status === 'All') {
            // Fetch ALL jobs, do not exclude 'Completed'
        } else {
            // Default View ("Inbox"): Status depends on Role
            if (!search) {
                // Role-based Inboxes
                const role = req.user.role;

                if (role === 'Documentation') {
                    // Only see New jobs (not yet sent to clearance)
                    conditions.push(`s.status = 'New'`);
                }
                else if (role === 'Clearance') {
                    // See jobs pending clearance or currently clearing (Cleared = Delivery Note issued, but not sent to accounts)
                    // 'Pending' comes from clearance.js (Schedule Clearance), 'Pending Clearance' comes from ShipmentRegistry.tsx (Send to Clearance)
                    conditions.push(`s.status IN ('Pending', 'Pending Clearance', 'Cleared', 'Payment Confirmation')`);
                }
                else if (role === 'Accountant') {
                    // See jobs sent for payment
                    conditions.push(`s.status = 'Payment'`);
                }
                else {
                    // Admin / All / Others: See everything except Completed (Active)
                    conditions.push(`s.status != 'Completed'`);
                }
            }
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY s.created_at DESC';

        const result = await pool.query(query, params);

        // Ensure packages is parsed if necessary
        const rows = result.rows.map(row => {
            if (typeof row.packages === 'string') {
                try {
                    row.packages = JSON.parse(row.packages);
                } catch (e) {
                    row.packages = [];
                }
            } else if (!row.packages) {
                row.packages = [];
            }

            // Ensure bls and containers are arrays
            if (!row.bls) row.bls = [];
            if (!row.containers) row.containers = [];

            return row;
        });

        res.json(rows);
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

        let documentsResult = { rows: [] };
        try {
            documentsResult = await pool.query('SELECT * FROM shipment_documents WHERE shipment_id = $1 ORDER BY uploaded_at DESC', [id]);
        } catch (e) { console.warn('Docs fetch failed', e.message); }

        let invoiceResult = { rows: [] };
        try {
            invoiceResult = await pool.query('SELECT * FROM invoices WHERE shipment_id = $1', [id]);
        } catch (e) { console.warn('Invoice fetch failed', e.message); }

        let clearanceResult = { rows: [] };
        try {
            clearanceResult = await pool.query('SELECT * FROM clearance_schedules WHERE job_id = $1', [id]);
        } catch (e) {
            console.warn('Clearance fetch failed:', e.message);
        }

        // Fetch Multi-BLs and Multi-Containers
        let containersResult = { rows: [] };
        try {
            containersResult = await pool.query('SELECT * FROM shipment_containers WHERE shipment_id = $1 ORDER BY created_at ASC', [id]);
        } catch (e) { console.warn('Containers fetch failed', e.message); }

        let blsResult = { rows: [] };
        try {
            blsResult = await pool.query('SELECT * FROM shipment_bls WHERE shipment_id = $1 ORDER BY created_at ASC', [id]);
        } catch (e) { console.warn('BLs fetch failed', e.message); }

        let deliveryNoteResult = { rows: [] };
        try {
            deliveryNoteResult = await pool.query(`
                SELECT DISTINCT dn.* 
                FROM delivery_notes dn
                JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
                WHERE dni.job_id = $1
            `, [id]);
        } catch (err) {
            console.warn('Delivery Note fetch failed (likely schema mismatch):', err.message);
        }

        // Calculate Payment Completion (Job Payments Module)
        let paymentsStats = { rows: [{ total: 0, paid_count: 0, pending_count: 0 }] };
        try {
            paymentsStats = await pool.query(`
                SELECT 
                    COUNT(*) as total, 
                    COUNT(*) FILTER (WHERE status = 'Paid') as paid_count,
                    COUNT(*) FILTER (WHERE status = 'Pending') as pending_count
                FROM job_payments 
                WHERE job_id = $1
            `, [id]);
        } catch (err) {
            console.warn('Payment stats fetch failed:', err.message);
        }

        const totalPayments = parseInt(paymentsStats.rows[0].total) || 0;
        const paidPayments = parseInt(paymentsStats.rows[0].paid_count) || 0;
        const pendingPayments = parseInt(paymentsStats.rows[0].pending_count) || 0;
        const isFullyPaid = totalPayments > 0 && totalPayments === paidPayments;

        const shipmentData = shipmentResult.rows[0];

        // Ensure packages is an array (handle TEXT vs JSONB column type discrepancies)
        if (shipmentData && typeof shipmentData.packages === 'string') {
            try {
                shipmentData.packages = JSON.parse(shipmentData.packages);
            } catch (e) {
                shipmentData.packages = [];
            }
        } else if (shipmentData && !shipmentData.packages) {
            shipmentData.packages = [];
        }

        res.json({
            ...shipmentData,
            documents: documentsResult.rows,
            invoice: invoiceResult.rows[0] || null,
            payment_status: invoiceResult.rows[0]?.status || 'Pending',
            invoice_id: invoiceResult.rows[0]?.id || null,
            clearance_schedule: clearanceResult.rows[0] || null,
            clearance_schedules: clearanceResult.rows,
            delivery_note: deliveryNoteResult.rows[0] || null,
            delivery_notes: deliveryNoteResult.rows,
            containers: containersResult.rows,
            bls: blsResult.rows,
            is_fully_paid: isFullyPaid,
            has_pending_payments: pendingPayments > 0
        });

    } catch (error) {
        console.error('Get shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- SUB-RESOURCES: CONTAINERS ---
router.post('/:id/containers', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { container_no, container_type, unloaded_date } = req.body;

        const result = await pool.query(
            'INSERT INTO shipment_containers (shipment_id, container_no, container_type, unloaded_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, container_no, container_type, unloaded_date]
        );
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id/containers/:containerId', authenticateToken, async (req, res) => {
    try {
        const { containerId } = req.params;
        await pool.query('DELETE FROM shipment_containers WHERE id = $1', [containerId]);
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:id/containers/:containerId', authenticateToken, async (req, res) => {
    try {
        const { containerId } = req.params;
        const { container_no, container_type, unloaded_date } = req.body;
        const result = await pool.query(
            'UPDATE shipment_containers SET container_no = $1, container_type = $2, unloaded_date = $3 WHERE id = $4 RETURNING *',
            [container_no, container_type, unloaded_date, containerId]
        );
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- SUB-RESOURCES: BL/AWB ---
router.post('/:id/bls', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { master_bl, house_bl, loading_port, vessel, etd, eta, delivery_agent, containers } = req.body;

        if (master_bl) {
            const check = await pool.query(
                'SELECT shipment_id FROM shipment_bls WHERE master_bl = $1',
                [master_bl]
            );
            if (check.rows.length > 0) {
                return res.status(400).json({ error: `BL Number "${master_bl}" already exists in Job ${check.rows[0].shipment_id}` });
            }
        }

        // Schema update handled by migration 037_add_packages_to_shipment_containers.sql

        // Allow legacy packages input if containers is missing, but prefer containers
        // If containers provided, structure them into 'packages' col of BL for storage
        // (BL packages column now acts as a content store, which can be flat or structured. Frontend handles view).
        const blContent = (containers && containers.length > 0) ? JSON.stringify(containers) : (req.body.packages ? JSON.stringify(req.body.packages) : '[]');

        const result = await pool.query(
            'INSERT INTO shipment_bls (shipment_id, master_bl, house_bl, delivery_agent, packages) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, master_bl, house_bl, delivery_agent, blContent]
        );

        // Sync Containers to shipment_containers table
        if (containers && Array.isArray(containers)) {
            for (const c of containers) {
                if (!c.container_no) continue;

                // Check if container already exists for this shipment
                const check = await pool.query('SELECT id FROM shipment_containers WHERE shipment_id = $1 AND container_no = $2', [id, c.container_no]);

                if (check.rows.length > 0) {
                    await pool.query(
                        'UPDATE shipment_containers SET container_type = $1, packages = $2 WHERE id = $3',
                        [c.container_type, JSON.stringify(c.packages || []), check.rows[0].id]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO shipment_containers (shipment_id, container_no, container_type, packages) VALUES ($1, $2, $3, $4)',
                        [id, c.container_no, c.container_type, JSON.stringify(c.packages || [])]
                    );
                }
            }
        }

        await logActivity(req.user.id, 'ADD_BL', `Added BL/AWB ${req.body.master_bl || ''}`, 'SHIPMENT', id);

        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:id/bls/:blId', authenticateToken, async (req, res) => {
    try {
        const { id, blId } = req.params;
        const { master_bl, house_bl, loading_port, vessel, etd, eta, delivery_agent, containers } = req.body;

        if (master_bl) {
            const check = await pool.query(
                'SELECT shipment_id FROM shipment_bls WHERE master_bl = $1 AND id != $2',
                [master_bl, blId]
            );
            if (check.rows.length > 0) {
                return res.status(400).json({ error: `BL Number "${master_bl}" already exists in Job ${check.rows[0].shipment_id}` });
            }
        }

        // Schema update handled by migration 037_add_packages_to_shipment_containers.sql

        const blContent = (containers && containers.length > 0) ? JSON.stringify(containers) : (req.body.packages ? JSON.stringify(req.body.packages) : '[]');

        const result = await pool.query(
            'UPDATE shipment_bls SET master_bl = $1, house_bl = $2, delivery_agent = $3, packages = $4 WHERE id = $5 RETURNING *',
            [master_bl, house_bl, delivery_agent, blContent, blId]
        );

        // Sync Containers
        if (containers && Array.isArray(containers)) {
            for (const c of containers) {
                if (!c.container_no) continue;

                const check = await pool.query('SELECT id FROM shipment_containers WHERE shipment_id = $1 AND container_no = $2', [id, c.container_no]);

                if (check.rows.length > 0) {
                    await pool.query(
                        'UPDATE shipment_containers SET container_type = $1, packages = $2 WHERE id = $3',
                        [c.container_type, JSON.stringify(c.packages || []), check.rows[0].id]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO shipment_containers (shipment_id, container_no, container_type, packages) VALUES ($1, $2, $3, $4)',
                        [id, c.container_no, c.container_type, JSON.stringify(c.packages || [])]
                    );
                }
            }
        }

        await logActivity(req.user.id, 'UPDATE_BL', `Updated BL/AWB ${req.body.master_bl || ''}`, 'SHIPMENT', id);

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id/bls/:blId', authenticateToken, async (req, res) => {
    try {
        const { blId } = req.params;
        await pool.query('DELETE FROM shipment_bls WHERE id = $1', [blId]);
        res.json({ message: 'Deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

const shipmentUpload = upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'packing_list', maxCount: 1 },
    { name: 'transport_doc', maxCount: 1 }
]);

// Create new shipment
router.post('/', authenticateToken, authorizeRole(['Administrator', 'All', 'Documentation']), shipmentUpload, async (req, res) => {
    try {
        const {
            sender_name, sender_address,
            receiver_name, receiver_address,
            description, weight, dimensions, price,
            date, expected_delivery_date, transport_mode,
            driver, vehicle_id, service,
            job_invoice_no,
            billing_contact, shipment_type,
            packages // ADDED
        } = req.body;

        const id = await generateShipmentId(transport_mode);
        const status = 'New';
        const progress = 0;

        // Map receiver_name to customer (Consignee is usually the customer)
        const customer = receiver_name;
        const origin = sender_address ? sender_address.split('\n')[0] : '';
        const destination = receiver_address ? receiver_address.split('\n')[0] : '';

        // Handle case where numeric fields might be undefined or empty string
        const safePrice = price ? parseFloat(price) : 0;
        const safeWeight = weight || '0';

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const shipmentQuery = `
                INSERT INTO shipments (
                    id, customer, status, progress, 
                    sender_name, sender_address, receiver_name, receiver_address,
                    weight, dimensions, price,
                    date, expected_delivery_date, transport_mode,
                    driver, vehicle_id, service, billing_contact, shipment_type, origin, 
                    created_by, exporter
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                RETURNING *
            `;

            const shipmentValues = [
                id, customer || 'Unknown', status, progress,
                sender_name || null, sender_address || null, receiver_name || null, receiver_address || null,
                safeWeight, dimensions || null, safePrice,
                date || null, expected_delivery_date || null, transport_mode || 'SEA',
                driver || null, vehicle_id || null, service || null, billing_contact || null, shipment_type || null, origin || null,
                req.user?.id || null, sender_name || null
            ];

            const shipmentResult = await client.query(shipmentQuery, shipmentValues);

            // Handle File Uploads (Parallel)
            if (req.files) {
                const fileTypes = ['invoice', 'packing_list', 'transport_doc'];
                const uploadPromises = fileTypes.map(async (type) => {
                    if (req.files[type]) {
                        const file = req.files[type][0];
                        let finalPath = file.path;

                        try {
                            const uploadResult = await uploadToSupabase(file.path, 'uploads', `shipments/${id}`);
                            finalPath = uploadResult.publicUrl;
                            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                        } catch (uploadError) {
                            console.error(`Supabase upload failed for ${type}:`, uploadError.message);
                        }

                        await client.query(
                            'INSERT INTO shipment_documents (shipment_id, file_name, file_path, file_type, file_size, document_type) VALUES ($1, $2, $3, $4, $5, $6)',
                            [id, file.originalname, finalPath, file.mimetype, file.size, type]
                        );
                    }
                });
                await Promise.all(uploadPromises);
            }

            // Create Job Invoice only if provided manually
            let invoiceGenerationPromise = null;
            if (job_invoice_no) {
                const invoiceId = job_invoice_no;

                // Fire invoice creation using client inside the tx
                await client.query(
                    'INSERT INTO invoices (id, shipment_id, amount, status) VALUES ($1, $2, $3, $4)',
                    [invoiceId, id, safePrice, 'Pending']
                );

                // Generate PDF concurrently with other tasks after commit
                invoiceGenerationPromise = (async () => {
                    try {
                        const invoiceData = {
                            receiver_name, customer, receiver_address, destination, description, price: safePrice
                        };
                        const invoicePath = await generateInvoicePDF(invoiceData, invoiceId);

                        await pool.query('UPDATE invoices SET file_path = $1 WHERE id = $2', [invoicePath, invoiceId]);
                    } catch (pdfError) {
                        console.error('PDF Generation failed:', pdfError);
                    }
                })();
            }

            // Log action synchronously in the transaction
            await client.query(
                'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                [req.user.id, 'CREATE_SHIPMENT', `Created shipment ${id}`, 'SHIPMENT', id]
            ).catch(err => console.error('Failed to write audit log:', err));

            await client.query('COMMIT');
            client.release();

            // Fire and forget additional parallel actions
            if (invoiceGenerationPromise) {
                invoiceGenerationPromise.catch(console.error);
            }

            // Notifications
            try {
                broadcastToAll('New Job Created', `New Job ${id} created by ${req.user.username}`, 'info', `/registry?selectedJobId=${id}`).catch(console.error);
            } catch (noteError) {
                console.error('Notification error:', noteError);
            }

            res.status(201).json(shipmentResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            throw error;
        }
    } catch (error) {
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
            date, expected_delivery_date, transport_mode,
            invoice_no, invoice_items, customs_r_form, no_of_pkgs,
            expense_macl, expense_mpl, expense_mcs, expense_transportation, expense_liner,
            vessel,
            office, cargo_type, unloaded_date,
            shipment_type, billing_contact, service,
            job_invoice_no,
            no_documents // ADDED
        } = req.body;

        // Validations for Duplicates
        if (invoice_no) {
            const check = await pool.query('SELECT id FROM shipments WHERE invoice_no = $1 AND id != $2', [invoice_no, id]);
            if (check.rows.length > 0) {
                return res.status(400).json({ error: `Shipment Invoice No "${invoice_no}" already exists in Job ${check.rows[0].id}` });
            }
        }

        if (customs_r_form) {
            const check = await pool.query('SELECT id FROM shipments WHERE customs_r_form = $1 AND id != $2', [customs_r_form, id]);
            if (check.rows.length > 0) {
                return res.status(400).json({ error: `Customs R Form "${customs_r_form}" already exists in Job ${check.rows[0].id}` });
            }
        }

        await pool.query('BEGIN');

        // Update Job Invoice ID if provided
        if (job_invoice_no) {
            // Check if invoice exists for this shipment
            const invCheck = await pool.query('SELECT id FROM invoices WHERE shipment_id = $1', [id]);
            if (invCheck.rows.length > 0) {
                await pool.query('UPDATE invoices SET id = $1 WHERE shipment_id = $2', [job_invoice_no, id]);
            } else {
                // Create new invoice record if missing
                await pool.query('INSERT INTO invoices (id, shipment_id, amount, status) VALUES ($1, $2, 0, $3)', [job_invoice_no, id, 'Pending']);
            }
        }

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
                 weight = COALESCE($9, weight),
                 dimensions = COALESCE($10, dimensions),
                 price = COALESCE($11, price),
                 date = COALESCE($12, date),
                 expected_delivery_date = COALESCE($13, expected_delivery_date),
                 transport_mode = COALESCE($14, transport_mode),
                 invoice_no = COALESCE($16, invoice_no),
                 invoice_items = COALESCE($17, invoice_items),
                 customs_r_form = COALESCE($18, customs_r_form),
                 expense_macl = COALESCE($19, expense_macl),
                 expense_mpl = COALESCE($20, expense_mpl),
                 expense_mcs = COALESCE($21, expense_mcs),
                 expense_transportation = COALESCE($22, expense_transportation),
                 expense_liner = COALESCE($23, expense_liner),
                 shipment_type = COALESCE($24, shipment_type),
                 billing_contact = COALESCE($25, billing_contact),
                 service = COALESCE($26, service),
                 unloaded_date = COALESCE($27, unloaded_date),
                 no_documents = COALESCE($28, no_documents),
                 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $15
             RETURNING *`,
            [
                status ?? null, progress ?? null, driver ?? null, vehicle_id ?? null,
                sender_name ?? null, sender_address ?? null, receiver_name ?? null, receiver_address ?? null,
                weight ?? null, dimensions ?? null, price ?? null,
                date ?? null, expected_delivery_date ?? null, transport_mode ?? null,
                id,
                invoice_no ?? null, invoice_items ?? null, customs_r_form ?? null,
                expense_macl ?? null, expense_mpl ?? null, expense_mcs ?? null, expense_transportation ?? null, expense_liner ?? null,
                shipment_type ?? null, billing_contact ?? null, service ?? null, unloaded_date ?? null,
                no_documents ?? null
            ]
        );

        if (result.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Shipment not found' });
        }

        const updatedShipment = result.rows[0];

        // AUTO-CREATE DELIVERY NOTE
        if (status === 'In Transit') {
            const checkDN = await pool.query('SELECT id FROM delivery_notes WHERE shipment_id = $1', [id]);
            if (checkDN.rows.length === 0) {
                const dnId = `DN-${new Date().getFullYear()}${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;

                await pool.query(
                    `INSERT INTO delivery_notes (
                        id, shipment_id, consignee, exporter, details_location, issued_by, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
                    [
                        dnId,
                        id,
                        updatedShipment.receiver_name || updatedShipment.destination,
                        updatedShipment.sender_name || updatedShipment.customer,
                        updatedShipment.destination,
                        req.user.username
                    ]
                );

                await pool.query(
                    'INSERT INTO delivery_note_jobs (delivery_note_id, job_no) VALUES ($1, $2)',
                    [dnId, id]
                );
            }
        }

        // Specific Activity Logging
        if (req.body.status === 'Completed') {
            await logActivity(req.user.id, 'JOB_COMPLETED', `Job marked as Completed`, 'SHIPMENT', id);
            try {
                await broadcastToAll('Job Completed', `Job ${id} (${updatedShipment.customer}) is now Completed.`, 'success', `/registry?selectedJobId=${id}`);
            } catch (ne) { console.error('Notification error', ne); }
        } else if (req.body.invoice_no) {
            // Heuristic: If invoice_no is being sent, it's likely a Shipment Invoice update
            await logActivity(req.user.id, 'UPDATE_SHIPMENT_INVOICE', `Shipment Invoice ${req.body.invoice_no} details updated`, 'SHIPMENT', id);
        } else if (req.body.job_invoice_no) {
            await logActivity(req.user.id, 'UPDATE_JOB_INVOICE', `Job Invoice ${req.body.job_invoice_no} details updated`, 'SHIPMENT', id);
        } else {
            await logActivity(req.user.id, 'UPDATE_SHIPMENT', `Updated shipment details`, 'SHIPMENT', id);
        }

        await pool.query('COMMIT');
        res.json(updatedShipment);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Update shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete shipment
router.delete('/:id', authenticateToken, authorizeRole(['Administrator', 'All']), async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('BEGIN');

        // 1. Delete related Invoices
        await pool.query('DELETE FROM invoices WHERE shipment_id = $1', [id]);

        // 2. Delete related Delivery Note Jobs (old schema)
        await pool.query('DELETE FROM delivery_note_jobs WHERE job_no = $1', [id]);

        // 2.1 Delete related Delivery Note Items (new schema - foreign key constraints)
        // Check for both direct job reference and schedule reference
        await pool.query(`
            DELETE FROM delivery_note_items 
            WHERE job_id = $1 
               OR schedule_id IN (SELECT id FROM clearance_schedules WHERE job_id = $1)
        `, [id]);

        // 2.2 Delete Job Payments (if cascade fails or to be explicit)
        await pool.query('DELETE FROM job_payments WHERE job_id = $1', [id]);

        // 2.3 Delete Shipment Documents (if cascade fails or to be explicit)
        await pool.query('DELETE FROM shipment_documents WHERE shipment_id = $1', [id]);

        // 3. Delete related Delivery Notes
        await pool.query('DELETE FROM delivery_notes WHERE shipment_id = $1', [id]);

        // 4. Delete related Clearance Schedules
        await pool.query('DELETE FROM clearance_schedules WHERE job_id = $1', [id]);

        // 5. Soft-delete History: Rename entity_id in logs so they don't show up for the new job
        // Preserve them for audit trails if needed, but detach from the active ID "slot"
        const timestamp = Date.now();
        // Rename entity_id for ALL logs matching this ID to ensure history is cleared for the ID slot.
        // We do not filter by entity_type just to be safe and catch everything linked to this ID string.
        await pool.query(
            "UPDATE audit_logs SET entity_id = $1 || '-DELETED-' || $2 WHERE entity_id = $1",
            [id, timestamp]
        );

        // 5. Delete the Shipment
        const result = await pool.query('DELETE FROM shipments WHERE id = $1 RETURNING *', [id]);

        await pool.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        res.json({ message: 'Shipment deleted successfully' });

        await logActivity(req.user.id, 'DELETE_SHIPMENT', `Deleted shipment ${id}`, 'SHIPMENT', id);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Delete shipment error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Upload Document to existing shipment
router.post('/:id/documents', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { document_type } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let finalPath = file.path;
        try {
            const uploadResult = await uploadToSupabase(file.path, 'uploads', `shipments/${id}`);
            finalPath = uploadResult.publicUrl;
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (uploadError) {
            console.error('Supabase upload failed:', uploadError.message);
        }

        await pool.query(
            'INSERT INTO shipment_documents (shipment_id, file_name, file_path, file_type, file_size, document_type, uploaded_at, uploaded_by, uploaded_by_name) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)',
            [id, file.originalname, finalPath, file.mimetype, file.size, document_type || 'Other', req.user.id, req.user.username]
        );

        await logActivity(req.user.id, 'UPLOAD_DOCUMENT', `Uploaded ${file.originalname} to shipment ${id}`, 'SHIPMENT', id);

        const documentsResult = await pool.query('SELECT * FROM shipment_documents WHERE shipment_id = $1 ORDER BY uploaded_at DESC', [id]);
        res.json(documentsResult.rows);

    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// View Document (Inline)
router.get('/:id/documents/:docId/view', authenticateToken, async (req, res) => {
    try {
        const { id, docId } = req.params;
        const docResult = await pool.query('SELECT * FROM shipment_documents WHERE id = $1 AND shipment_id = $2', [docId, id]);
        if (docResult.rows.length === 0) return res.status(404).send('Document not found');
        const doc = docResult.rows[0];

        // If it's a cloud URL, redirect to it
        if (doc.file_path && doc.file_path.startsWith('http')) {
            return res.redirect(doc.file_path);
        }

        // 1. Try the stored path directly (normalized)
        let filePath = path.resolve(doc.file_path);

        if (!fs.existsSync(filePath)) {
            // 2. Fallback: Check in 'server/uploads' or 'uploads' relative to CWD using the basename
            const filename = path.basename(doc.file_path);
            const possiblePaths = [
                path.join(process.cwd(), 'server', 'uploads', filename),
                path.join(process.cwd(), 'uploads', filename),
                path.join(__dirname, '..', 'uploads', filename)
            ];

            const foundPath = possiblePaths.find(p => fs.existsSync(p));
            if (foundPath) {
                console.log(`[View] Recovered file at: ${foundPath} (Original: ${doc.file_path})`);
                filePath = foundPath;
            } else {
                console.error(`[View] File missing at ${filePath} and fallbacks`);
                return res.status(404).send('File not found on server disk');
            }
        } else {
            console.log(`[View] Serving file: ${filePath}`);
        }

        res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('View document error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Download Document (Attachment)
router.get('/:id/documents/:docId/download', authenticateToken, async (req, res) => {
    try {
        const { id, docId } = req.params;
        const docResult = await pool.query('SELECT * FROM shipment_documents WHERE id = $1 AND shipment_id = $2', [docId, id]);
        if (docResult.rows.length === 0) return res.status(404).send('Document not found');
        const doc = docResult.rows[0];

        // If it's a cloud URL, redirect to it
        if (doc.file_path && doc.file_path.startsWith('http')) {
            return res.redirect(doc.file_path);
        }

        // 1. Try the stored path directly (normalized)
        let filePath = path.resolve(doc.file_path);

        if (!fs.existsSync(filePath)) {
            // 2. Fallback: Check in 'server/uploads' or 'uploads' relative to CWD using the basename
            const filename = path.basename(doc.file_path);
            const possiblePaths = [
                path.join(process.cwd(), 'server', 'uploads', filename),
                path.join(process.cwd(), 'uploads', filename),
                path.join(__dirname, '..', 'uploads', filename)
            ];

            const foundPath = possiblePaths.find(p => fs.existsSync(p));
            if (foundPath) {
                console.log(`[Download] Recovered file at: ${foundPath} (Original: ${doc.file_path})`);
                filePath = foundPath;
            } else {
                console.error(`[Download] File missing at ${filePath} and fallbacks`);
                return res.status(404).send('File not found on server disk');
            }
        } else {
            console.log(`[Download] Serving file: ${filePath}`);
        }

        res.download(filePath, doc.file_name);
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete Document from shipment
router.delete('/:id/documents/:docId', authenticateToken, async (req, res) => {
    try {
        const { id, docId } = req.params;

        const docResult = await pool.query('SELECT * FROM shipment_documents WHERE id = $1 AND shipment_id = $2', [docId, id]);

        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = docResult.rows[0];

        if (doc.file_path && fs.existsSync(doc.file_path)) {
            try {
                fs.unlinkSync(doc.file_path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }

        await pool.query('DELETE FROM shipment_documents WHERE id = $1', [docId]);

        await logActivity(req.user.id, 'DELETE_DOCUMENT', `Deleted document ${doc.file_name} from shipment ${id}`, 'SHIPMENT', id);

        const documentsResult = await pool.query('SELECT * FROM shipment_documents WHERE shipment_id = $1 ORDER BY uploaded_at DESC', [id]);
        res.json(documentsResult.rows);

    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
