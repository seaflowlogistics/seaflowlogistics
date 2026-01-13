import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { logsAPI } from '../services/api';
import { User, Calendar, Activity, Loader2, Search } from 'lucide-react';

// import { useAuth } from '../contexts/AuthContext';


interface Log {
    id: number;
    user_id: string;
    action: string;
    details: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    performed_by: string;
}

const Logs: React.FC = () => {
    // const { user: currentUser } = useAuth(); // Unused now

    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        const fetchLogs = async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const response = await logsAPI.getAll({
                    search: searchTerm,
                    date: filterDate
                });
                setLogs(response.data);
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        // Initial fetch
        fetchLogs();

        const timeoutId = setTimeout(() => {
            fetchLogs();
        }, 500); // Debounce

        // Poll for updates every 5 seconds (but use the current filter state ref if possible, or just re-run)
        // Note: Simple interval with closure capture of initial state won't work perfectly for updating filters.
        // We will rely on dependency array [searchTerm, filterDate] to trigger updates + a separate poller.

        const intervalId = setInterval(() => {
            // Only poll if not actively searching to avoid race conditions with debounce
            // Actually, for simplicity, let's just re-fetch with current state.
            // Since interval closure captures old state, we need a ref or just rely on 'useEffect' re-triggering.
            // A better pattern for hooks:
            fetchLogs(true);
        }, 3000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [searchTerm, filterDate]);

    if (loading && logs.length === 0) { // Only show full loader if no data
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </Layout>
        );
    }

    // Removed Access Denied block to allow all users to view logs


    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
                    <p className="text-gray-600 mt-1">Audit trail of system activities and changes.</p>
                </div>

                {/* Filters */}
                <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by User Name or Activity..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm"
                        />
                    </div>
                    <div className="relative w-full md:w-auto">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full md:w-48 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm cursor-pointer"
                        />
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Action</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Details</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">User</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-primary-500" />
                                                <span className="font-medium text-gray-900">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-gray-600">{log.details}</p>
                                            <span className="text-xs text-gray-400">ID: {log.entity_id}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-700">{log.performed_by || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        No logs found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Logs;
