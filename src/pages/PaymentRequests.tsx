import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { paymentsAPI } from '../services/api';
import { Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Payment {
    id: number;
    job_id: string;
    payment_type: string;
    vendor: string;
    amount: string;
    status: string;
    requested_by_name: string;
    processed_by_name?: string;
    created_at: string;
    customer?: string;
}

const PaymentRequests: React.FC = () => {
    const navigate = useNavigate();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    const loadPayments = async () => {
        setLoading(true);
        try {
            // For Pending tab, fetch 'Confirmation Requested'
            // For History, maybe fetch 'Confirmed' or 'Rejected' (if we tracked rejected)
            let status = '';
            if (activeTab === 'pending') {
                status = 'Confirmation Requested';
            } else {
                status = 'Confirmed'; // Just showing confirmed for now in history ?
            }

            const res = await paymentsAPI.getListing({
                status,
                search: searchTerm,
                limit: 100 // manageable limit
            });

            // API returns { data: [], total: ... }
            setPayments(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
    }, [activeTab, searchTerm]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(payments.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleConfirm = async (confirmed: boolean) => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to ${confirmed ? 'confirm' : 'reject'} ${selectedIds.length} payment requests?`)) return;

        try {
            await paymentsAPI.confirmBatch(selectedIds.map(String), confirmed);
            loadPayments();
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            alert('Failed to process requests');
        }
    };

    return (
        <Layout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Payment Requests</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage payment confirmation requests from accounts.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64 text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        </div>
                        <button onClick={loadPayments} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Pending Approvals
                            {activeTab === 'pending' && payments.length > 0 && (
                                <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600">
                                    {payments.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Approved History
                        </button>
                    </nav>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 flex items-center justify-between animate-fade-in-down">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-900">{selectedIds.length} items selected</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleConfirm(true)}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirm Selected
                            </button>
                            <button
                                onClick={() => handleConfirm(false)}
                                className="px-4 py-2 bg-white text-red-600 border border-red-200 text-sm font-bold rounded-lg hover:bg-red-50 shadow-sm flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject Selected
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={payments.length > 0 && selectedIds.length === payments.length}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Shipment</th>
                                <th className="px-6 py-4">Pay To</th>
                                <th className="px-6 py-4">Requested By</th>
                                <th className="px-6 py-4 text-right">Amount (MVR)</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No payment requests found</td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                onChange={() => handleSelect(payment.id)}
                                                checked={selectedIds.includes(payment.id)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/registry?selectedJobId=${payment.job_id}`)}
                                                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                            >
                                                {payment.job_id}
                                            </button>
                                            <div className="text-xs text-gray-500 mt-0.5">{payment.customer}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{payment.payment_type}</div>
                                            <div className="text-xs text-gray-500">{payment.vendor}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                    {(payment.requested_by_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-gray-700">{payment.requested_by_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            {parseFloat(payment.amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${payment.status === 'Confirmation Requested'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {payment.status === 'Confirmation Requested' ? 'Waiting Clearance' : payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {activeTab === 'pending' && (
                                                <button
                                                    onClick={() => { setSelectedIds([payment.id]); handleConfirm(true); }}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default PaymentRequests;
