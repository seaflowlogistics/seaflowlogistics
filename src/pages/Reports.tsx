import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Loader2, TrendingUp, Package, CheckCircle, Clock } from 'lucide-react';

const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        thisMonth: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await shipmentsAPI.getAll();
                const shipments = response.data || [];
                processChartData(shipments);
            } catch (error) {
                console.error("Failed to fetch report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const processChartData = (shipments: any[]) => {
        // Initialize aggregation map
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();

        // Create base data structure for current year
        const monthlyData = months.map(month => ({
            name: month,
            Shipments: 0,
            Completed: 0
        }));

        let total = 0;
        let completed = 0;
        let pending = 0;
        let thisMonthCount = 0;
        const currentMonthIndex = new Date().getMonth();

        shipments.forEach(shipment => {
            const date = new Date(shipment.created_at || Date.now());
            const monthIndex = date.getMonth();
            const year = date.getFullYear();

            // Stats Calculation
            total++;
            if (shipment.status === 'Completed') completed++;
            else pending++;

            if (year === currentYear && monthIndex === currentMonthIndex) {
                thisMonthCount++;
            }

            // Chart Data Aggregation (Current Year Only for clarity)
            if (year === currentYear) {
                monthlyData[monthIndex].Shipments += 1;
                if (shipment.status === 'Completed') {
                    monthlyData[monthIndex].Completed += 1;
                }
            }
        });

        setStats({
            total,
            completed,
            pending,
            thisMonth: thisMonthCount
        });

        setChartData(monthlyData);
    };

    return (
        <Layout>
            <div className="p-8 animate-fade-in space-y-8 font-sans">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics & Reports</h1>
                    <p className="text-gray-500 mt-1">Overview of shipment performance and operational metrics.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Shipments</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
                                </div>
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Package className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Jobs</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stats.completed}</h3>
                                </div>
                                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active / Pending</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stats.pending}</h3>
                                </div>
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">This Month</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stats.thisMonth}</h3>
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Bar Chart */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                    Monthly Shipment Volume
                                </h3>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            margin={{
                                                top: 20,
                                                right: 30,
                                                left: 20,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#F3F4F6' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar
                                                dataKey="Shipments"
                                                fill="#4F46E5"
                                                radius={[4, 4, 0, 0]}
                                                barSize={32}
                                                name="Total Shipments"
                                            />
                                            <Bar
                                                dataKey="Completed"
                                                fill="#10B981"
                                                radius={[4, 4, 0, 0]}
                                                barSize={32}
                                                name="Completed Jobs"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Summary / Side Panel */}
                            <div className="bg-slate-900 text-white p-8 rounded-xl shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-2xl"></div>

                                <h3 className="text-xl font-bold mb-2 relative z-10">Performance Insight</h3>
                                <p className="text-slate-400 text-sm mb-8 relative z-10">
                                    Your team has completed <span className="text-white font-bold">{((stats.completed / (stats.total || 1)) * 100).toFixed(0)}%</span> of all registered jobs this year.
                                </p>

                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-400">Completion Rate</span>
                                            <span className="font-bold">{((stats.completed / (stats.total || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                                                style={{ width: `${(stats.completed / (stats.total || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-400">Monthly Target (Est. 50)</span>
                                            <span className="font-bold">{Math.min(((stats.thisMonth / 50) * 100), 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-2 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(((stats.thisMonth / 50) * 100), 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
