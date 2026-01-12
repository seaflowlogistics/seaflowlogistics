import bcrypt from 'bcrypt';
import pool from '../config/database.js';

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database...');

        // Hash password for admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Insert admin user
        await pool.query(
            `INSERT INTO users (username, password, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO NOTHING`,
            ['admin', hashedPassword, 'Administrator']
        );

        // Insert sample vehicles
        const vehicles = [
            ['TRK-001', 'Heavy Truck', 'John Smith', 'Active', 'En route to New York', 85, 'Good', '45,230 mi', '15 days'],
            ['TRK-008', 'Medium Truck', 'Mike Davis', 'Active', 'En route to Miami', 62, 'Good', '32,450 mi', '8 days'],
            ['TRK-015', 'Light Truck', 'Sarah Johnson', 'Idle', 'San Francisco Depot', 95, 'Excellent', '18,920 mi', '22 days'],
            ['TRK-022', 'Heavy Truck', 'Tom Wilson', 'Maintenance', 'Houston Service Center', 40, 'Service Required', '67,890 mi', 'In Progress'],
            ['TRK-029', 'Medium Truck', 'Emily Brown', 'Active', 'En route to Chicago', 71, 'Good', '28,340 mi', '12 days'],
            ['TRK-035', 'Light Truck', 'David Lee', 'Idle', 'Los Angeles Depot', 88, 'Good', '21,560 mi', '18 days'],
        ];

        for (const vehicle of vehicles) {
            await pool.query(
                `INSERT INTO vehicles (id, type, driver, status, location, fuel, maintenance, mileage, next_service)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
                vehicle
            );
        }

        // Insert sample shipments
        const shipments = [
            ['SH-2024-001', 'Acme Corporation', 'Los Angeles, CA', 'New York, NY', 'In Transit', 65, '2,500 lbs', '2024-01-10', 'John Smith', 'TRK-001'],
            ['SH-2024-002', 'TechStart Inc', 'Seattle, WA', 'San Francisco, CA', 'Delivered', 100, '1,800 lbs', '2024-01-09', 'Sarah Johnson', 'TRK-015'],
            ['SH-2024-003', 'Global Traders LLC', 'Miami, FL', 'Chicago, IL', 'Processing', 15, '3,200 lbs', '2024-01-11', 'Pending', null],
            ['SH-2024-004', 'Retail Plus', 'Dallas, TX', 'Miami, FL', 'In Transit', 42, '1,950 lbs', '2024-01-10', 'Mike Davis', 'TRK-008'],
            ['SH-2024-005', 'Manufacturing Co', 'Detroit, MI', 'Houston, TX', 'Delayed', 28, '4,100 lbs', '2024-01-08', 'Tom Wilson', 'TRK-022'],
        ];

        for (const shipment of shipments) {
            await pool.query(
                `INSERT INTO shipments (id, customer, origin, destination, status, progress, weight, date, driver, vehicle_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
                shipment
            );
        }

        // Insert analytics data
        const analyticsData = [
            ['total_revenue', 328000, '2024-01-01'],
            ['total_shipments', 1847, '2024-01-01'],
            ['on_time_rate', 94.8, '2024-01-01'],
            ['avg_delivery_time', 2.4, '2024-01-01'],
        ];

        for (const data of analyticsData) {
            await pool.query(
                `INSERT INTO analytics (metric_type, metric_value, date)
         VALUES ($1, $2, $3)`,
                data
            );
        }

        console.log('✅ Database seeded successfully!');
        console.log('📝 Admin credentials: username=admin, password=admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();
