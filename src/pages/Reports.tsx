import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface Shipment {
    id: string;
    consignee_name: string;
    created_at: string;
    status: string;
    port_of_loading?: string;
    transport_mode?: string;
    // Add other fields as needed based on API response
    [key: string]: any;
}

const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date());
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    // Stats
    const [stats, setStats] = useState({
        pending: 0,
        completed: 0,
        cancelled: 0,
        total: 0
    });

    // Filtered Shipments for Table
    const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        processData();
    }, [date, shipments]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll();
            const data = response.data || [];
            setShipments(data);
        } catch (error) {
            console.error("Failed to fetch report data", error);
        } finally {
            setLoading(false);
        }
    };

    const processData = () => {
        if (!shipments.length) return;

        const year = date.getFullYear();
        const month = date.getMonth();

        // 1. Filter shipments for the selected month
        const monthShipments = shipments.filter(s => {
            const d = new Date(s.created_at);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        filteredShipments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setFilteredShipments(monthShipments);

        // 2. Calculate Stats (Overall or for this month? User image says "Last 30 days" under cards, but usually reports are for the selected period. Let's stick to selected month stats for consistency with the chart)
        // Actually, typical dashboard logic:
        // - Cards: Summary of the VIEWED period (selected month).
        let pending = 0;
        let completed = 0;
        let cancelled = 0;

        monthShipments.forEach(s => {
            const st = s.status?.toLowerCase() || '';
            if (st === 'completed') completed++;
            else if (st === 'cancelled' || st === 'terminated') cancelled++;
            else pending++;
        });

        setStats({
            pending,
            completed,
            cancelled,
            total: monthShipments.length
        });

        // 3. Prepare Chart Data (Day by Day)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyData = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDate = new Date(year, month, i);
            const dateStr = dayDate.toISOString().split('T')[0]; // YYYY-MM-DD

            // Count for this day
            const dayShipments = monthShipments.filter(s => {
                const sDate = new Date(s.created_at);
                return sDate.getDate() === i;
            });

            // You can split by status if you want stacked area, or just total volume
            // The image shows a single line/area. Let's do Total Volume.
            dailyData.push({
                date: dateStr,
                day: i,
                volume: dayShipments.length
            });
        }

        setChartData(dailyData);
    };

    const handlePrevMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                    <p className="text-sm font-bold text-gray-900">{new Date(label).toDateString()}</p>
                    <p className="text-sm text-indigo-600 font-medium">
                        Shipments: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Layout>
            <div className="p-8 font-sans animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">Reports</h1>

                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2 font-medium text-gray-700 w-32 justify-center">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500 text-sm font-medium">Pending Jobs</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</h3>
                                <p className="text-xs text-gray-400 mt-1">in {date.toLocaleDateString('en-US', { month: 'long' })}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500 text-sm font-medium">Completed Jobs</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.completed}</h3>
                                <p className="text-xs text-gray-400 mt-1">in {date.toLocaleDateString('en-US', { month: 'long' })}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500 text-sm font-medium">Cancelled Jobs</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.cancelled}</h3>
                                <p className="text-xs text-gray-400 mt-1">in {date.toLocaleDateString('en-US', { month: 'long' })}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500 text-sm font-medium">Total Jobs</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</h3>
                                <p className="text-xs text-gray-400 mt-1">in {date.toLocaleDateString('en-US', { month: 'long' })}</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="h-[350px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={chartData}
                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => new Date(val).getDate().toString()}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="volume"
                                            stroke="#F59E0B"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorVolume)"
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Job Details Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900">Job Details</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Job</th>
                                            <th className="px-6 py-4">Consignee</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Port</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {filteredShipments.length > 0 ? (
                                            filteredShipments.map((job) => (
                                                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{job.id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">{job.consignee_name || job.consignee || '-'}</span>
                                                            <span className="text-xs text-gray-500">{job.exporter_name || job.exporter || ''}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {new Date(job.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                                            ${job.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                                job.status === 'Clearance' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-gray-100 text-gray-700'}`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 uppercase">{job.port_of_loading || job.port || '-'}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                                                            onClick={() => window.open(`/shipments/${job.id}`, '_blank')} // Or navigate
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    No jobs found for this month.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
