import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    Package,
    Search,
    Filter,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    Trash,
    Upload,
    ArrowRight
} from 'lucide-react';

const Shipments: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [shipmentToDelete, setShipmentToDelete] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === shipments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(shipments.map(s => s.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        // Use the modal for confirmation if possible, or simple confirm for bulk
        // Re-using the modal is tricky for bulk. I'll use a specific bulk confirmation or just generic confirm.
        // Or I can update shipmentToDelete to be a special 'BULK' object?
        // Simpler: standard confirm for now.
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} shipments? This cannot be undone.`)) return;

        const idsToDelete = [...selectedIds];
        // Optimistic update
        setShipments(prev => prev.filter(s => !idsToDelete.includes(s.id)));
        setSelectedIds([]);

        try {
            await Promise.all(idsToDelete.map(id => shipmentsAPI.delete(id)));
        } catch (error) {
            console.error('Bulk delete failed', error);
            alert('Some shipments could not be deleted.');
            // Reload to sync
            const response = await shipmentsAPI.getAll({ search: searchTerm, status: filterStatus });
            setShipments(response.data);
        }
    };


    const handleDeleteClick = (shipment: any) => {
        setShipmentToDelete(shipment);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!shipmentToDelete) return;

        const itemToDelete = shipmentToDelete;
        // Optimistically remove from list
        setShipments(prev => prev.filter(s => s.id !== itemToDelete.id));
        setDeleteModalOpen(false);
        setShipmentToDelete(null);

        try {
            await shipmentsAPI.delete(itemToDelete.id);
            // Success - no further action needed as item is already removed from UI
        } catch (error) {
            console.error('Failed to delete shipment', error);
            alert('Failed to delete shipment. Please try again.');
            // Revert optimistic update
            setShipments(prev => [...prev, itemToDelete]);
        }
    };

    // Removed handleUndo as we are deleting immediately now



    useEffect(() => {
        const fetchShipments = async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const response = await shipmentsAPI.getAll({
                    search: searchTerm,
                    status: filterStatus
                });

                setShipments(response.data);
            } catch (error) {
                console.error('Error fetching shipments:', error);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        // Initial fetch and debounce search
        const timeoutId = setTimeout(() => {
            fetchShipments();
        }, 500);

        // Poll for updates every 5 seconds
        const intervalId = setInterval(() => {
            fetchShipments(true); // silent = true
        }, 5000);

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [searchTerm, filterStatus]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'In Transit':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Processing':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Delayed':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Delivered':
                return <CheckCircle className="w-4 h-4" />;
            case 'Delayed':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };



    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Shipment Tracking</h1>
                        <p className="text-gray-600 mt-1">Monitor and manage all shipments</p>
                    </div>
                    <button
                        onClick={() => navigate('/shipments/new')}
                        className="btn-primary"
                    >
                        <Package className="w-5 h-5 inline mr-2" />
                        New Shipment
                    </button>
                    <label className="btn-secondary cursor-pointer relative flex items-center gap-2 px-4">
                        {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"><Loader2 className="w-4 h-4 animate-spin text-primary-600" /></div>}
                        <Upload className="w-4 h-4" />
                        <span>Import Excel</span>
                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={async (e) => {
                            if (e.target.files?.[0]) {
                                const file = e.target.files[0];
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                    setLoading(true);
                                    const res = await shipmentsAPI.import(formData);
                                    alert(`Import successful: ${res.data.success} added.`);
                                    const response = await shipmentsAPI.getAll({
                                        search: searchTerm,
                                        status: filterStatus
                                    });
                                    setShipments(response.data);
                                } catch (error) {
                                    console.error('Import failed', error);
                                    alert('Failed to import shipments. Please check the file format.');
                                } finally {
                                    setLoading(false);
                                    e.target.value = '';
                                }
                            }
                        }} />
                    </label>

                </div>

                {/* Filters */}
                <div className="glass-card p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by ID or customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input-field pl-10 pr-8 appearance-none cursor-pointer"
                            >
                                <option>All</option>
                                <option>New</option>
                                <option>Processing</option>
                                <option>In Transit</option>
                                <option>Delivered</option>
                                <option>Delayed</option>
                            </select>
                        </div>

                        {/* Select All */}
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4 md:ml-2">
                            <input
                                type="checkbox"
                                checked={shipments.length > 0 && selectedIds.length === shipments.length}
                                onChange={handleSelectAll}
                                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                id="select-all"
                            />
                            <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                                Select All
                            </label>
                        </div>
                    </div>
                </div>

                {/* Shipments Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {shipments.map((shipment, index) => (
                            <div
                                key={shipment.id}
                                className={`bg-white border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between hover:border-primary-200 hover:shadow-sm transition-all duration-200 animate-slide-in ${selectedIds.includes(shipment.id) ? 'ring-1 ring-primary-500 bg-primary-50/30' : ''}`}
                                style={{ animationDelay: `${index * 0.01}s` }}
                                onClick={() => navigate(`/shipments/${shipment.id}`)}
                            >
                                {/* Left: Checkbox + ID + Customer */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(shipment.id)}
                                        onChange={(e) => { e.stopPropagation(); toggleSelect(shipment.id); }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">{shipment.id}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">{shipment.customer}</p>
                                    </div>
                                </div>

                                {/* Middle: Route */}
                                <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 flex-1 px-8">
                                    <div className="flex flex-col items-start min-w-[100px] max-w-[150px]">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Origin</span>
                                        <span className="font-medium truncate w-full" title={shipment.origin}>{shipment.origin}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    <div className="flex flex-col items-start min-w-[100px] max-w-[150px]">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Destination</span>
                                        <span className="font-medium truncate w-full" title={shipment.destination}>{shipment.destination}</span>
                                    </div>
                                </div>

                                {/* Right: Status + Date + Actions */}
                                <div className="flex items-center gap-6">
                                    <div className="hidden lg:block text-right">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {shipment.date ? new Date(shipment.date).toLocaleDateString() : '-'}
                                        </p>
                                    </div>

                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(shipment.status)}`}>
                                        {getStatusIcon(shipment.status)}
                                        {shipment.status}
                                    </span>

                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => navigate(`/shipments/${shipment.id}`)}
                                            className="btn-secondary text-xs px-3 py-1.5"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(shipment);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Delete Shipment"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && shipments.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No shipments found</h3>
                        <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                    </div>
                )}
                {/* Delete Confirmation Modal */}
                {deleteModalOpen && shipmentToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete Shipment?</h3>
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete shipment <span className="font-mono font-bold text-gray-800">{shipmentToDelete.id}</span>?
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setDeleteModalOpen(false); setShipmentToDelete(null); }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-lg hover:shadow-red-200 transition-all flex items-center gap-2"
                                >
                                    <Trash className="w-4 h-4" />
                                    Delete Shipment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-bounce-in border border-gray-200">
                        <span className="font-semibold text-gray-900 whitespace-nowrap">{selectedIds.length} Selected</span>
                        <div className="h-6 w-px bg-gray-300" />

                        <button onClick={() => setSelectedIds([])} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                            Clear
                        </button>

                        <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full font-medium hover:bg-red-100 flex items-center gap-2 transition-colors">
                            <Trash className="w-4 h-4" /> Delete ({selectedIds.length})
                        </button>
                    </div>
                )}

            </div>
        </Layout >
    );
};

export default Shipments;
