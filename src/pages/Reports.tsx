import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { reportsAPI } from '../services/api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Loader2, Calendar as CalendarIcon, Download, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'Monthly' | 'Yearly'>('Monthly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [chartData, setChartData] = useState<any[]>([]);
    const [expenseBreakdown, setExpenseBreakdown] = useState<{
        company: { name: string; value: number }[];
        customer: { name: string; value: number }[];
    }>({ company: [], customer: [] });

    // Summary Stats (for the selected range)
    const [stats, setStats] = useState({
        registered: 0,
        cleared: 0,
        invoiced: 0,
        companyPaid: 0,
        customerPaid: 0
    });

    useEffect(() => {
        fetchData();
    }, [viewMode, selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.getSummary({
                year: selectedYear,
                type: viewMode
            });

            const { chartData, stats, expenseBreakdown } = response.data;
            setChartData(chartData);
            setStats(stats);
            setExpenseBreakdown(expenseBreakdown);
        } catch (error) {
            console.error("Failed to fetch report data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        try {
            const response = await reportsAPI.download({
                year: selectedYear,
                type: viewMode
            });

            // Create download link
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_${viewMode}_${selectedYear}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download report");
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm z-50">
                    <p className="font-bold text-gray-900 mb-2">{label} {viewMode === 'Monthly' ? selectedYear : ''}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-gray-600 font-medium">{entry.name}:</span>
                            </div>
                            <span className="font-bold text-gray-900">
                                {entry.name.includes('Paid') ? entry.value : entry.value}
                            </span>
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

                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Download Button */}
                        <button
                            onClick={handleDownloadReport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Generate Report
                        </button>

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
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-7xl mx-auto">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Registered</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.registered}</h3>
                                <p className="text-xs text-gray-400 mt-1">Jobs Created</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Cleared</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.cleared}</h3>
                                <p className="text-xs text-gray-400 mt-1">Delivery Notes</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Invoiced</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.invoiced}</h3>
                                <p className="text-xs text-gray-400 mt-1">Jobs Completed</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Company Paid</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.companyPaid}</h3>
                                <p className="text-xs text-gray-400 mt-1">Expenses</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-violet-500">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Customer Paid</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.customerPaid}</h3>
                                <p className="text-xs text-gray-400 mt-1">Expenses</p>
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

                        {/* Expense Breakdown Pie Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
                            {/* Company Expenses */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-indigo-600" />
                                    Company Expenses ({selectedYear})
                                </h3>
                                <div className="h-[350px] w-full mt-4">
                                    {expenseBreakdown.company.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={expenseBreakdown.company}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {expenseBreakdown.company.map((_entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => `QAR ${(value || 0).toLocaleString()}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400">No company expenses recorded</div>
                                    )}
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-gray-500 text-sm">Total: <span className="font-bold text-gray-900">QAR {stats.companyPaid?.toLocaleString() || 0}</span></p>
                                </div>
                            </div>

                            {/* Customer Expenses */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-violet-600" />
                                    Customer Expenses ({selectedYear})
                                </h3>
                                <div className="h-[350px] w-full mt-4">
                                    {expenseBreakdown.customer.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={expenseBreakdown.customer}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {expenseBreakdown.customer.map((_entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: any) => `QAR ${(value || 0).toLocaleString()}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400">No customer expenses recorded</div>
                                    )}
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-gray-500 text-sm">Total: <span className="font-bold text-gray-900">QAR {stats.customerPaid?.toLocaleString() || 0}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
