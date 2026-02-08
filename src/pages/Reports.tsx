import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';

interface Shipment {
    id: string;
    created_at: string;
    cleared_at?: string;
    invoice_date?: string;
    status: string;
    payment_status?: string;
    [key: string]: any;
}

const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'Monthly' | 'Yearly'>('Monthly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    // Summary Stats (for the selected range)
    const [stats, setStats] = useState({
        registered: 0,
        cleared: 0,
        invoiced: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        processData();
    }, [viewMode, selectedYear, shipments]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll({ status: 'All' });
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

        const dataMap = new Map();
        let registeredTotal = 0;
        let clearedTotal = 0;
        let invoicedTotal = 0;

        if (viewMode === 'Monthly') {
            // Initialize 12 months for selectedYear
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            months.forEach((m, index) => {
                dataMap.set(index, { name: m, Registered: 0, Cleared: 0, Invoiced: 0 });
            });

            shipments.forEach(s => {
                // Registered
                if (s.created_at) {
                    const d = new Date(s.created_at);
                    if (d.getFullYear() === selectedYear) {
                        const mIndex = d.getMonth();
                        if (dataMap.has(mIndex)) {
                            dataMap.get(mIndex).Registered++;
                            registeredTotal++;
                        }
                    }
                }
                // Cleared
                if (s.cleared_at) {
                    const d = new Date(s.cleared_at);
                    if (d.getFullYear() === selectedYear) {
                        const mIndex = d.getMonth();
                        if (dataMap.has(mIndex)) {
                            dataMap.get(mIndex).Cleared++;
                            clearedTotal++;
                        }
                    }
                }
                // Invoiced
                if (s.invoice_date) {
                    const d = new Date(s.invoice_date);
                    if (d.getFullYear() === selectedYear) {
                        const mIndex = d.getMonth();
                        if (dataMap.has(mIndex)) {
                            dataMap.get(mIndex).Invoiced++;
                            invoicedTotal++;
                        }
                    }
                }
            });

        } else {
            // Yearly View (Last 5 years)
            const currentYear = new Date().getFullYear();
            const startYear = currentYear - 4;

            for (let y = startYear; y <= currentYear; y++) {
                dataMap.set(y, { name: y.toString(), Registered: 0, Cleared: 0, Invoiced: 0 });
            }

            shipments.forEach(s => {
                // Registered
                if (s.created_at) {
                    const y = new Date(s.created_at).getFullYear();
                    if (dataMap.has(y)) {
                        dataMap.get(y).Registered++;
                        registeredTotal++;
                    }
                }
                // Cleared
                if (s.cleared_at) {
                    const y = new Date(s.cleared_at).getFullYear();
                    if (dataMap.has(y)) {
                        dataMap.get(y).Cleared++;
                        clearedTotal++;
                    }
                }
                // Invoiced
                if (s.invoice_date) {
                    const y = new Date(s.invoice_date).getFullYear();
                    if (dataMap.has(y)) {
                        dataMap.get(y).Invoiced++;
                        invoicedTotal++;
                    }
                }
            });
        }

        setChartData(Array.from(dataMap.values()));
        setStats({ registered: registeredTotal, cleared: clearedTotal, invoiced: invoicedTotal });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                    <p className="font-bold text-gray-900 mb-2">{label} {viewMode === 'Monthly' ? selectedYear : ''}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-gray-600 font-medium">{entry.name}:</span>
                            <span className="font-bold text-gray-900">{entry.value}</span>
                        </div>
                    ))}
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
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                        <p className="text-gray-500 mt-1">
                            {viewMode === 'Monthly' ? `Monthly Breakdown (${selectedYear})` : 'Yearly Overview'}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex">
                            <button
                                onClick={() => setViewMode('Monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'Monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setViewMode('Yearly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'Yearly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Yearly
                            </button>
                        </div>

                        {/* Year Selector (Only for Monthly view) */}
                        {viewMode === 'Monthly' && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                                <p className="text-gray-500 text-sm font-medium">Shipments Registered</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.registered}</h3>
                                <p className="text-xs text-gray-400 mt-1">Total Created</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
                                <p className="text-gray-500 text-sm font-medium">Shipments Cleared</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.cleared}</h3>
                                <p className="text-xs text-gray-400 mt-1">Delivery Notes Issued</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                                <p className="text-gray-500 text-sm font-medium">Completed Invoices</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.invoiced}</h3>
                                <p className="text-xs text-gray-400 mt-1">Invoices Generated</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                {viewMode === 'Monthly' ? `Monthly Trends (${selectedYear})` : 'Yearly Performance'}
                            </h3>
                            <div className="h-[450px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                        <Line
                                            type="monotone"
                                            dataKey="Registered"
                                            stroke="#3B82F6"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                            name="Registered"
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="Cleared"
                                            stroke="#F97316"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                            name="Cleared"
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="Invoiced"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                            name="Invoiced"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
