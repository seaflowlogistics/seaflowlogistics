import React, { useState, useEffect } from 'react';
import { Search, Package, Anchor, Plane, Truck, CheckCircle, FileText, Calendar, Filter } from 'lucide-react';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';

const CompletedShipments = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredJobs, setFilteredJobs] = useState<any[]>([]);

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        // Local filtering can be a fallback, but the backend handles 'search' param too.
        // We'll rely on backend search for better performance with large datasets.
        const delaySearch = setTimeout(() => {
            fetchJobs();
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const res = await shipmentsAPI.getAll({
                status: 'Completed',
                search: searchTerm
            });
            setJobs(res.data);
        } catch (error) {
            console.error('Failed to fetch completed jobs', error);
        } finally {
            setLoading(false);
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode?.toUpperCase()) {
            case 'SEA': return <Anchor className="w-3 h-3" />;
            case 'AIR': return <Plane className="w-3 h-3" />;
            case 'ROAD': return <Truck className="w-3 h-3" />;
            default: return <Package className="w-3 h-3" />;
        }
    };

    const getModeColor = (mode: string) => {
        switch (mode?.toUpperCase()) {
            case 'SEA': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'AIR': return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'ROAD': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <Layout>
            <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header Section */}
                <div className="px-8 pt-8 pb-6 bg-white border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Completed Shipments</h1>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Archive of all finalized jobs and their records.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200">
                                {jobs.length} Shipments Found
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by Job #, BL, R-number, or Invoice No..."
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm transition-all focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Main Content Table */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-[#fbfbfb]">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                    <th className="py-4 px-6">Job Records</th>
                                    <th className="py-4 px-4">Completion Date</th>
                                    <th className="py-4 px-4">Party Details</th>
                                    <th className="py-4 px-4">Documentation</th>
                                    <th className="py-4 px-4">Reference Nos</th>
                                    <th className="py-4 px-6 text-right">Transport Mode</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading && jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-sm font-bold text-gray-400">Fetching records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-gray-400">
                                                <Package className="w-16 h-16 opacity-20" />
                                                <p className="text-lg font-bold">No completed shipments matching your search.</p>
                                                <button onClick={() => setSearchTerm('')} className="text-sm font-bold text-indigo-600 hover:underline">Clear all filters</button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-indigo-50/30 transition-all duration-150 group">
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-indigo-600 group-hover:scale-105 transition-transform origin-left">{job.id}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{job.service || 'SERVICE'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-2 text-gray-600 underline-offset-4 decoration-gray-200">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-xs font-semibold">
                                                        {job.cleared_at ? new Date(job.cleared_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="text-sm font-extrabold text-gray-900 truncate" title={job.customer}>{job.customer}</span>
                                                    <span className="text-xs text-gray-500 font-medium truncate mt-0.5" title={job.exporter}>Exp: {job.exporter}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {job.bls && job.bls.length > 0 ? (
                                                        job.bls.slice(0, 2).map((bl: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-1.5 bg-gray-100/80 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 w-fit">
                                                                <FileText className="w-2.5 h-2.5 opacity-50" />
                                                                {bl.master_bl}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No BL details</span>
                                                    )}
                                                    {job.bls?.length > 2 && (
                                                        <span className="text-[10px] font-bold text-indigo-500 ml-1">+{job.bls.length - 2} more</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase w-12">R-Form:</span>
                                                        <span className="text-xs font-bold text-gray-700">{job.customs_r_form || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase w-12">Invoice:</span>
                                                        <span className="text-xs font-bold text-indigo-600">{job.invoice_id || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex justify-end">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shadow-sm flex items-center gap-1.5 transition-all group-hover:shadow-md ${getModeColor(job.transport_mode)}`}>
                                                        {getModeIcon(job.transport_mode)}
                                                        {job.transport_mode || 'SEA'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CompletedShipments;
