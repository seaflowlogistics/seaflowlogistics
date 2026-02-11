import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import XLSX from 'xlsx';

const router = express.Router();

// Get Report Summary (Monthly/Yearly)
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const { year, type } = req.query; // type = 'Monthly' or 'Yearly'
        const selectedYear = parseInt(year) || new Date().getFullYear();

        // 1. Shipment Stats (Registered, Cleared, Invoiced)
        // We can reuse the logic from Reports.tsx but do it in SQL for efficiency

        // Base Condition
        // Monthly: Group by Month for selectedYear
        // Yearly: Group by Year for last 5 years

        let groupByClause;
        let dateFilterClause;
        let selectClause;

        if (type === 'Yearly') {
            const startYear = new Date().getFullYear() - 4;
            // Generates series of years
            // PostgreSQL specific
            // Actually, let's just fetch atomic data and aggregate in JS like before? 
            // It might be easier given the multiple date columns (created_at, cleared_at, invoice_date).
            // Doing it in one SQL query with multiple dates is complex (need UNION or multiple queries).
            // Multiple queries is fine.
        }

        // Let's stick to the previous approach of fetching all relevant rows and processing in JS? 
        // No, that doesn't scale.
        // Let's optimize: Fetch aggregates per month/year.

        const queries = {
            Registered: `
                SELECT ${type === 'Monthly' ? "EXTRACT(MONTH FROM created_at)" : "EXTRACT(YEAR FROM created_at)"} as time_unit, 
                COUNT(*) as count 
                FROM shipments 
                WHERE ${type === 'Monthly' ? `EXTRACT(YEAR FROM created_at) = $1` : `created_at >= NOW() - INTERVAL '5 years'`}
                GROUP BY time_unit
            `,
            Cleared: `
                SELECT ${type === 'Monthly' ? "EXTRACT(MONTH FROM dn.created_at)" : "EXTRACT(YEAR FROM dn.created_at)"} as time_unit, 
                COUNT(DISTINCT s.id) as count 
                FROM shipments s
                JOIN delivery_note_items dni ON s.id = dni.job_id
                JOIN delivery_notes dn ON dni.delivery_note_id = dn.id
                WHERE ${type === 'Monthly' ? `EXTRACT(YEAR FROM dn.created_at) = $1` : `dn.created_at >= NOW() - INTERVAL '5 years'`}
                GROUP BY time_unit
            `,
            Invoiced: `
                SELECT ${type === 'Monthly' ? "EXTRACT(MONTH FROM i.created_at)" : "EXTRACT(YEAR FROM i.created_at)"} as time_unit, 
                COUNT(DISTINCT s.id) as count 
                FROM shipments s
                JOIN invoices i ON s.id = i.shipment_id
                WHERE i.status = 'Completed' AND (${type === 'Monthly' ? `EXTRACT(YEAR FROM i.created_at) = $1` : `i.created_at >= NOW() - INTERVAL '5 years'`})
                GROUP BY time_unit
            `,
            // Expenses (Job Payments)
            Expenses: `
                SELECT 
                    ${type === 'Monthly' ? "EXTRACT(MONTH FROM paid_at)" : "EXTRACT(YEAR FROM paid_at)"} as time_unit,
                    paid_by,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM job_payments
                WHERE status = 'Paid' 
                AND (${type === 'Monthly' ? `EXTRACT(YEAR FROM paid_at) = $1` : `paid_at >= NOW() - INTERVAL '5 years'`})
                GROUP BY time_unit, paid_by
            `
        };

        const params = type === 'Monthly' ? [selectedYear] : [];

        const [registeredRes, clearedRes, invoicedRes, expensesRes] = await Promise.all([
            pool.query(queries.Registered, params),
            pool.query(queries.Cleared, params),
            pool.query(queries.Invoiced, params),
            pool.query(queries.Expenses, params)
        ]);

        // Process Logic
        // Normalize time_unit keys (1-12 for months, YYYY for years)

        // Initialize Result Map
        const dataMap = new Map();

        if (type === 'Monthly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            months.forEach((m, idx) => {
                dataMap.set(idx + 1, {
                    name: m,
                    Registered: 0,
                    Cleared: 0,
                    Invoiced: 0,
                    CompanyPaid: 0,
                    CustomerPaid: 0,
                    CompanyPaidAmount: 0,
                    CustomerPaidAmount: 0
                });
            });
        } else {
            const currentYear = new Date().getFullYear();
            for (let y = currentYear - 4; y <= currentYear; y++) {
                dataMap.set(y, {
                    name: y.toString(),
                    Registered: 0,
                    Cleared: 0,
                    Invoiced: 0,
                    CompanyPaid: 0,
                    CustomerPaid: 0,
                    CompanyPaidAmount: 0,
                    CustomerPaidAmount: 0
                });
            }
        }

        // Fill Data
        registeredRes.rows.forEach(r => {
            const t = parseInt(r.time_unit);
            if (dataMap.has(t)) dataMap.get(t).Registered = parseInt(r.count);
        });
        clearedRes.rows.forEach(r => {
            const t = parseInt(r.time_unit);
            if (dataMap.has(t)) dataMap.get(t).Cleared = parseInt(r.count);
        });
        invoicedRes.rows.forEach(r => {
            const t = parseInt(r.time_unit);
            if (dataMap.has(t)) dataMap.get(t).Invoiced = parseInt(r.count);
        });
        expensesRes.rows.forEach(r => {
            const t = parseInt(r.time_unit);
            if (dataMap.has(t)) {
                const entry = dataMap.get(t);
                if (r.paid_by === 'Company') {
                    entry.CompanyPaid += parseInt(r.count);
                    entry.CompanyPaidAmount += parseFloat(r.total_amount);
                } else if (r.paid_by === 'Client' || r.paid_by === 'Customer') { // handle variations
                    entry.CustomerPaid += parseInt(r.count);
                    entry.CustomerPaidAmount += parseFloat(r.total_amount);
                }
            }
        });

        const chartData = Array.from(dataMap.values());

        // Summary Stats
        const stats = {
            registered: chartData.reduce((acc, curr) => acc + curr.Registered, 0),
            cleared: chartData.reduce((acc, curr) => acc + curr.Cleared, 0),
            invoiced: chartData.reduce((acc, curr) => acc + curr.Invoiced, 0),
            companyPaid: chartData.reduce((acc, curr) => acc + curr.CompanyPaid, 0),
            customerPaid: chartData.reduce((acc, curr) => acc + curr.CustomerPaid, 0),
        };

        res.json({ chartData, stats });

    } catch (error) {
        console.error('Reports Summary Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download Report (Excel)
router.get('/download', authenticateToken, async (req, res) => {
    try {
        const { year, type } = req.query;
        const selectedYear = parseInt(year) || new Date().getFullYear();

        // Fetch Detailed Data for Export
        // We want a list of Shipments with their statuses + Expenses

        let query = `
            SELECT 
                s.id as "Job ID",
                s.customer as "Customer",
                TO_CHAR(s.created_at, 'YYYY-MM-DD') as "Registered Date",
                s.status as "Status",
                (SELECT TO_CHAR(dn.created_at, 'YYYY-MM-DD') FROM delivery_notes dn JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id WHERE dni.job_id = s.id LIMIT 1) as "Cleared Date",
                (SELECT i.invoice_no FROM invoices i WHERE i.shipment_id = s.id LIMIT 1) as "Invoice No",
                
                -- Expense Summaries
                COALESCE((SELECT SUM(amount) FROM job_payments WHERE job_id = s.id AND status = 'Paid' AND paid_by = 'Company'), 0) as "Company Paid Exp",
                COALESCE((SELECT SUM(amount) FROM job_payments WHERE job_id = s.id AND status = 'Paid' AND paid_by IN ('Client', 'Customer')), 0) as "Customer Paid Exp"

            FROM shipments s
            WHERE 1=1
        `;

        const params = [];
        if (type === 'Monthly') {
            query += ` AND EXTRACT(YEAR FROM s.created_at) = $1`;
            params.push(selectedYear);
        } else {
            // Yearly view usually downloads "All for this year" or "All time"?
            // Let's assume Yearly view download means "All data for the visible range (last 5 years)" or just "All"?
            // Let's stick to selectedYear if Monthly, else maybe everything or specific year?
            // The UI usually selects a year for Monthly view. For "Yearly" view mode, it shows 5 years.
            // Let's download for the CURRENT year by default if type is Monthly, or All if Yearly?
            // Usually reports are "Monthly Report for X Year" or "Annual Report for X Year".
            // I'll filter by selectedYear regardless, unless 'Yearly' mode implies something else.
            // Actually, if View is 'Yearly', the user sees year-by-year bars. Downloading usually gets the *source data* for those years.
            if (type === 'Yearly') {
                query += ` AND s.created_at >= NOW() - INTERVAL '5 years'`;
            }
        }

        query += ` ORDER BY s.created_at DESC`;

        const result = await pool.query(query, params);

        // Create Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, "Report");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${type}_${selectedYear}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error('Report Download Error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

export default router;
