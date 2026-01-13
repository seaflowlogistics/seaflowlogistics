import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { logsAPI } from '../services/api';
import { User, Calendar, Activity, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        const fetchLogs = async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const response = await logsAPI.getAll();
                setLogs(response.data);
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        fetchLogs();

        // Poll for updates every 3 seconds for "instant" feel
        const intervalId = setInterval(() => {
            fetchLogs(true);
        }, 3000);

        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
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
                            {logs.map((log) => (
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Logs;
