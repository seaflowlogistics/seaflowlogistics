
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { containersAPI } from '../services/api';
import Layout from '../components/Layout';

interface ContainerRecord {
    job_id: string;
    job_created_at: string;
    container_no: string;
    consignee: string;
    exporter: string;
    clearance_date: string | null;
    delivery_note_id: string | null;
    delivery_note_status: string | null;
}

const Containers: React.FC = () => {
    const [containers, setContainers] = useState<ContainerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchContainers();
    }, [page, limit, searchTerm]);

    const fetchContainers = async () => {
        try {
            setLoading(true);
            const response = await containersAPI.getAll({ search: searchTerm, page, limit });
            setContainers(response.data.data);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Failed to fetch containers', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatCreatedDate = (dateString: string) => {
        if (!dateString) return '';
        return `Created: ${formatDate(dateString)}`;
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to first page on search
    };

    return (
        <Layout>
            <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900">Containers</h1>
                    <p className="text-gray-500 mt-1">Monitor container activity, deadlines, and delivery statuses.</p>
                </div>

                {/* Controls */}
                <div className="px-8 mb-6 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">

                        {/* Search Bar */}
                        <div className="flex-1 w-full relative">
                            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                                SEARCH CONTAINERS
                            </label>
                            <div className="relative">
                                <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by container, consignee, exporter, job or location"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>

                        {/* Sort & Pagination Controls placeholder */}
                        <div className="flex gap-8 items-end">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                                    SORT BY
                                </label>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium border border-blue-100 cursor-pointer">Created ↓</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">Unloaded</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">Expires</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">Days left</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">Clearance</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">Delivery note</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                                    RECORDS PER PAGE
                                </label>
                                <select
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 min-w-[120px]"
                                    value={limit}
                                    onChange={(e) => setLimit(Number(e.target.value))}
                                >
                                    <option value={10}>10 records</option>
                                    <option value={20}>20 records</option>
                                    <option value={50}>50 records</option>
                                    <option value={100}>100 records</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-400">
                            Showing {containers.length > 0 ? 1 : 0} - {containers.length} of {total} containers
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={containers.length < limit}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs font-semibold tracking-wider">
                                    <th className="py-4 px-6 w-1/4">Consignee</th>
                                    <th className="py-4 px-6 w-1/5">Container</th>
                                    <th className="py-4 px-6 w-1/6">Job</th>
                                    <th className="py-4 px-6 w-1/6">Clearance</th>
                                    <th className="py-4 px-6 w-1/6">Delivery Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-500">Loading containers...</td>
                                    </tr>
                                ) : containers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-500">No containers found.</td>
                                    </tr>
                                ) : (
                                    containers.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors group">
                                            {/* Consignee */}
                                            <td className="py-5 px-6 align-top">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 mb-1 leading-tight">{item.consignee || 'Unknown Consignee'}</span>
                                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{item.exporter || 'Unknown Exporter'}</span>
                                                </div>
                                            </td>

                                            {/* Container */}
                                            <td className="py-5 px-6 align-top">
                                                <div className="flex items-start gap-3">
                                                    <RefreshCw className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 mb-1 leading-tight">{item.container_no}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">{formatCreatedDate(item.job_created_at)}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Job */}
                                            <td className="py-5 px-6 align-top">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 mb-1 leading-tight">{item.job_id}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{formatDate(item.job_created_at)}</span>
                                                </div>
                                            </td>

                                            {/* Clearance */}
                                            <td className="py-5 px-6 align-middle">
                                                {item.clearance_date ? (
                                                    <div className="inline-flex items-center gap-1.5 text-green-600 font-medium text-xs">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span>{formatDate(item.clearance_date!)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded bg-orange-50 text-orange-600 border border-orange-100 text-xs font-semibold">
                                                        Not cleared
                                                    </span>
                                                )}
                                            </td>

                                            {/* Delivery Note */}
                                            <td className="py-5 px-6 align-middle">
                                                {item.delivery_note_id ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 text-xs font-bold">
                                                        Generated
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100 text-xs font-medium">
                                                        Pending
                                                    </span>
                                                )}
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

export default Containers;
