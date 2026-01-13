import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Search, Calendar, ChevronDown } from 'lucide-react';

const ClearanceSchedule: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clearanceType, setClearanceType] = useState('All types');
    const [transportMode, setTransportMode] = useState('All modes');
    const [date, setDate] = useState('');

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clearance Schedule</h1>
                        <p className="text-gray-500 mt-1">Clearance schedule for the jobs.</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        Delivery Note Mode
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Search */}
                        <div className="lg:col-span-5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Search Clearances</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Job number, consignee, exporter, container, BL/AWB"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Clearance Type */}
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Clearance Type</label>
                            <div className="relative">
                                <select
                                    value={clearanceType}
                                    onChange={(e) => setClearanceType(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option>All types</option>
                                    <option>Normal</option>
                                    <option>Express</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Transport Mode */}
                        <div className="lg:col-span-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Transport Mode</label>
                            <div className="relative">
                                <select
                                    value={transportMode}
                                    onChange={(e) => setTransportMode(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option>All modes</option>
                                    <option>Road</option>
                                    <option>Sea</option>
                                    <option>Air</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Date */}
                        <div className="">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Clearance Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter date"
                                    onFocus={(e) => e.target.type = 'date'}
                                    onBlur={(e) => e.target.type = 'text'}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 text-xs text-gray-400 font-medium">
                        Showing 0 of 0 clearances
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead>
                                <tr className="bg-black text-white">
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">Job</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[240px]">Consignee</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Container</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Packages</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Type</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Port</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Method</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Transport</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Date</th>
                                    <th className="py-4 px-6 text-center text-xs font-bold uppercase tracking-wider w-[80px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* Empty State / Rows will go here */}
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-gray-500 text-sm">
                                        No scheduled clearances found.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ClearanceSchedule;
