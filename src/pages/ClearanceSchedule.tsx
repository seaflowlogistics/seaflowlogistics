import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Search, Calendar, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { clearanceAPI, deliveryNotesAPI, consigneesAPI, shipmentsAPI } from '../services/api';
import ScheduleClearanceDrawer from '../components/ScheduleClearanceDrawer';
import ClearanceDetailsDrawer from '../components/ClearanceDetailsDrawer';
import DeliveryNoteDrawer from '../components/DeliveryNoteDrawer';

const formatWeight = (val: any): string => {
    if (val === undefined || val === null || val === '') return '-';

    let content = val;
    // Attempt to parse JSON string
    if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
        try {
            content = JSON.parse(val);
        } catch (e) {
            // Failed to parse, use valid string
        }
    }

    // If it's an object (or array), extract values
    if (typeof content === 'object' && content !== null) {
        if (Array.isArray(content)) {
            if (content.length > 0) content = content[0];
        } else {
            // If object, take first value. 
            // Handles cases like {"": "0"} or {"weight": 500}
            const values = Object.values(content);
            if (values.length > 0) content = values[0];
        }
    }

    // Try to parse as float
    const floatVal = parseFloat(String(content));
    if (!isNaN(floatVal)) {
        return floatVal.toString();
    }

    return String(content);
};

const getWeightFromJobBL = (job: any, blNo: string): string | null => {
    if (!job || !job.bls || !Array.isArray(job.bls) || !blNo) return null;

    // Find BL
    const bl = job.bls.find((b: any) => b.master_bl === blNo);
    if (!bl || !bl.packages) return null;

    let totalPoints = 0;
    let foundAny = false;

    try {
        const parsed = typeof bl.packages === 'string' ? JSON.parse(bl.packages) : bl.packages;

        const processPkg = (p: any) => {
            if (p.weight) {
                // Handle comma decimals if present (e.g. "1,000.50" or "10,5")
                // Usually standard is "1000.50". If clean float string, parseFloat works.
                const valStr = String(p.weight).replace(/,/g, '');
                const w = parseFloat(valStr);
                if (!isNaN(w)) {
                    totalPoints += w;
                    foundAny = true;
                }
            }
        };

        if (Array.isArray(parsed)) {
            parsed.forEach((entry: any) => {
                // Check if entry is a container (has packages array) or a package
                if (entry.packages && Array.isArray(entry.packages)) {
                    entry.packages.forEach(processPkg);
                } else {
                    processPkg(entry);
                }
            });
        }
    } catch (e) {
        // Silent error
    }

    return foundAny ? totalPoints.toFixed(2) : null;
};

const ClearanceSchedule: React.FC = () => {
    const { hasRole } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [clearanceType, setClearanceType] = useState('All types');
    const [transportMode, setTransportMode] = useState('All modes');
    const [date, setDate] = useState('');
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
    const [consigneesList, setConsigneesList] = useState<any[]>([]);
    const [shipmentsList, setShipmentsList] = useState<any[]>([]);

    // Delivery Note Mode State
    const [isDeliveryNoteMode, setIsDeliveryNoteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeliveryDrawerOpen, setIsDeliveryDrawerOpen] = useState(false);
    // Document handling state
    const [selectedJobDocs, setSelectedJobDocs] = useState<{ jobId: string, docs: any[] } | null>(null);
    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

    const viewDocument = async (jobId: string, doc: any) => {
        try {
            const response = await shipmentsAPI.viewDocument(jobId, doc.id);
            const blob = new Blob([response.data], { type: doc.file_type || 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Failed to view document", error);
            alert("Failed to view document");
        }
    };

    const canViewDocs = hasRole('Administrator') || hasRole('Clearance') || hasRole('Clearance - Office') || hasRole('Clearance - Labour') || hasRole('All');

    const handleShipmentClick = async (jobId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canViewDocs) return; // Guard against unauthorized clicks if any
        if (loadingJobId) return;

        setLoadingJobId(jobId);
        try {
            const res = await shipmentsAPI.getById(jobId);
            const docs = res.data.documents || [];

            if (docs.length === 0) {
                alert(`No documents found for Shipment ${jobId}`);
            } else if (docs.length === 1) {
                // If only one document, view it directly
                await viewDocument(jobId, docs[0]);
            } else {
                // If multiple, show the list modal
                setSelectedJobDocs({ jobId, docs });
                setIsDocsModalOpen(true);
            }
        } catch (error) {
            console.error("Failed to load shipment documents", error);
            alert("Failed to load documents");
        } finally {
            setLoadingJobId(null);
        }
    };

    // Components
    const DocumentsListModal = () => {
        if (!isDocsModalOpen || !selectedJobDocs) return null;

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Shipment Documents</h3>
                            <p className="text-sm text-gray-500">Job: <span className="font-mono font-medium text-indigo-600">{selectedJobDocs.jobId}</span></p>
                        </div>
                        <button
                            onClick={() => setIsDocsModalOpen(false)}
                            className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-2 max-h-[60vh] overflow-y-auto">
                        {selectedJobDocs.docs.map((doc, index) => (
                            <div
                                key={doc.id || index}
                                onClick={() => viewDocument(selectedJobDocs.jobId, doc)}
                                className="flex items-center gap-4 p-4 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors border-b last:border-0 border-gray-50 group"
                            >
                                <div className="p-3 bg-indigo-100/50 text-indigo-600 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 truncate">{doc.document_type || 'Document'}</h4>
                                    <p className="text-xs text-gray-500 truncate">{doc.file_name}</p>
                                </div>
                                <div className="text-xs text-gray-400 group-hover:text-indigo-600 font-medium">
                                    View
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                        <button
                            onClick={() => setIsDocsModalOpen(false)}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        const fetchSchedules = async () => {
            setLoading(true);
            try {
                const response = await clearanceAPI.getAll({
                    search: searchTerm,
                    type: clearanceType,
                    transport_mode: transportMode,
                    date: date
                });
                setSchedules(response.data);

                const consigneesRes = await consigneesAPI.getAll();
                setConsigneesList(consigneesRes.data || []);

                const shipmentsRes = await shipmentsAPI.getAll();
                setShipmentsList(shipmentsRes.data || []);
            } catch (error) {
                console.error("Failed to fetch clearance schedules", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSchedules();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, clearanceType, transportMode, date]);



    const canEdit = hasRole('Administrator') || hasRole('Clearance') || hasRole('Clearance - Office') || hasRole('All');

    const handleEditClick = (schedule: any) => {
        setEditingSchedule(schedule);
        setIsDrawerOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (editingSchedule) {
                await clearanceAPI.update(editingSchedule.id, data);
                alert('Clearance Rescheduled Successfully!');
            }
            setEditingSchedule(null);
            setIsDrawerOpen(false);

            // Refund/Reload logic - ideally just re-fetch but reload for safety as per existing code
            window.location.reload();
        } catch (error) {
            console.error('Failed to update clearance', error);
            alert('Failed to update clearance');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this clearance schedule?')) {
            try {
                await clearanceAPI.delete(id);
                setSchedules(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error('Failed to delete clearance', error);
                alert('Failed to delete clearance');
            }
        }
    };

    const toggleDeliveryNoteMode = () => {
        setIsDeliveryNoteMode(!isDeliveryNoteMode);
        setSelectedIds([]); // Reset selection when toggling
    };

    const handleSelectSchedule = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeliveryNoteSave = async (data: any) => {
        try {
            await deliveryNotesAPI.create(data);
            alert('Delivery Note Created Successfully!');

            // Instantly remove the processed schedules from the view
            setSchedules(prev => prev.filter(s => !selectedIds.includes(s.id)));

            setIsDeliveryDrawerOpen(false);
            setSelectedIds([]);
            setIsDeliveryNoteMode(false);
        } catch (error: any) {
            console.error('Failed to create delivery note', error);
            alert(error.response?.data?.error || error.message || 'Failed to create delivery note');
        }
    };

    const getSelectedSchedules = () => {
        return schedules.filter(s => selectedIds.includes(s.id));
    };

    return (
        <Layout>
            <DocumentsListModal />
            <div className="space-y-6 animate-fade-in font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clearance Schedule</h1>
                        <p className="text-gray-500 mt-1">Clearance schedule for the jobs.</p>
                    </div>
                    <div className="flex gap-2">


                        {canEdit && (
                            isDeliveryNoteMode && selectedIds.length > 0 ? (
                                <button
                                    onClick={() => setIsDeliveryDrawerOpen(true)}
                                    className="px-4 py-2 bg-indigo-600 border border-transparent text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <span>Create Note ({selectedIds.length})</span>
                                </button>
                            ) : (
                                <button
                                    onClick={toggleDeliveryNoteMode}
                                    className={`px-4 py-2 border font-medium rounded-lg transition-colors shadow-sm ${isDeliveryNoteMode ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {isDeliveryNoteMode ? 'Hide Delivery Note Picker' : 'Delivery Note Mode'}
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200 shadow-sm space-y-3 lg:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6">
                        {/* Search */}
                        <div className="col-span-1 lg:col-span-5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 lg:mb-2">Search Clearances</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Job number, consignee, exporter, container, BL/AWB"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-1.5 lg:py-2.5 bg-white border border-gray-200 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Clearance Type */}
                        <div className="col-span-1 lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 lg:mb-2">Clearance Type</label>
                            <div className="relative">
                                <select
                                    value={clearanceType}
                                    onChange={(e) => setClearanceType(e.target.value)}
                                    className="w-full pl-4 pr-10 py-1.5 lg:py-2.5 bg-white border border-gray-200 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option>All types</option>
                                    <option>Normal</option>
                                    <option>Express</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Transport Mode */}
                        <div className="col-span-1 lg:col-span-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 lg:mb-2">Transport Mode</label>
                            <div className="relative">
                                <select
                                    value={transportMode}
                                    onChange={(e) => setTransportMode(e.target.value)}
                                    className="w-full pl-4 pr-10 py-1.5 lg:py-2.5 bg-white border border-gray-200 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option>All modes</option>
                                    <option>Road</option>
                                    <option>Sea</option>
                                    <option>Air</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="col-span-1 lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 lg:mb-2">Clearance Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-1.5 lg:py-2.5 bg-white border border-gray-200 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 text-gray-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 text-xs text-gray-400 font-medium">
                        Showing {schedules.length} clearances
                    </div>
                </div>




                {/* Tables by Port */}
                <div className="space-y-8">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl animate-pulse">
                            Loading schedules...
                        </div>
                    ) : (
                        <>
                            {['MALE', 'HULHUMALE', 'MALE AIRPORT', 'ADDU'].map(portName => {
                                const portSchedules = schedules.filter(s => (s.port || '').toUpperCase() === portName);
                                if (portSchedules.length === 0) return null;

                                return (
                                    <div key={portName} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-800 uppercase tracking-wide">{portName} Port</h3>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-200/50 px-2 py-1 rounded-full">{portSchedules.length} Clearances</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[1000px]">
                                                <thead>
                                                    <tr className="bg-black text-white">
                                                        {isDeliveryNoteMode && (
                                                            <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[50px]">Select</th>
                                                        )}
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Shipment</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[180px]">Consignee</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Method</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">BL No.</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">Customs R</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">C Number</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Container</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[80px]">Size</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Weight</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Packages</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Delivery details</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Date</th>
                                                        <th className="py-4 px-6 text-center text-xs font-bold uppercase tracking-wider w-[80px]">Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {portSchedules.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''}`}
                                                            onClick={() => {
                                                                if (isDeliveryNoteMode) {
                                                                    handleSelectSchedule(item.id);
                                                                } else {
                                                                    setSelectedSchedule(item);
                                                                }
                                                            }}
                                                        >
                                                            {isDeliveryNoteMode && (
                                                                <td className="py-4 px-6 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedIds.includes(item.id)}
                                                                        onChange={() => handleSelectSchedule(item.id)}
                                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </td>
                                                            )}
                                                            {/* Job */}
                                                            <td className="py-4 px-6 text-sm font-semibold text-indigo-600 group/job">
                                                                <div
                                                                    className="flex items-center gap-2 cursor-pointer hover:text-indigo-800 transition-colors"
                                                                    onClick={(e) => handleShipmentClick(item.job_id, e)}
                                                                >
                                                                    {item.job_id}
                                                                    {item.reschedule_reason && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700" title={`Reason: ${item.reschedule_reason}`}>Rescheduled</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-normal">{new Date(item.job?.created_at || item.created_at).toLocaleDateString()}</div>
                                                            </td>
                                                            {/* Consignee */}
                                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                                                                {item.consignee || 'Unknown'}
                                                            </td>
                                                            {/* Method */}
                                                            <td className="py-4 px-6 text-sm text-gray-600 uppercase">
                                                                {item.clearance_method || '-'}
                                                            </td>
                                                            {/* BL No. */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {item.bl_awb || '-'}
                                                            </td>
                                                            {/* Customs R Number */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {(() => {
                                                                    const job = shipmentsList.find((s: any) => s.id === item.job_id);
                                                                    return job?.customs_r_form || item.customs_r_form || item.job?.customs_r_form || '-';
                                                                })()}
                                                            </td>
                                                            {/* C Number */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {(() => {
                                                                    const consigneeName = item.consignee || '';
                                                                    const matchedConsignee = consigneesList.find((c: any) => c.name?.toLowerCase() === consigneeName.toLowerCase());
                                                                    return matchedConsignee?.c_number || item.c_number || item.job?.c_number || '-';
                                                                })()}
                                                            </td>
                                                            {/* Container No. */}
                                                            <td className="py-4 px-6 text-sm text-gray-600 font-mono">
                                                                {item.container_no ? (
                                                                    item.container_no.split(',').map((no: string, idx: number) => (
                                                                        <div key={idx}>{no.trim()}</div>
                                                                    ))
                                                                ) : '-'}
                                                            </td>
                                                            {/* Size */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {item.container_type ? (
                                                                    item.container_type.split(',').map((type: string, idx: number) => (
                                                                        <div key={idx}>{type.trim()}</div>
                                                                    ))
                                                                ) : '-'}
                                                            </td>
                                                            {/* Gross Weight */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {(() => {
                                                                    const job = shipmentsList.find((s: any) => s.id === item.job_id);
                                                                    const blWeight = getWeightFromJobBL(job, item.bl_awb);
                                                                    if (blWeight !== null) return blWeight;
                                                                    return formatWeight(item.weight || item.gross_weight || job?.weight || item.job?.weight);
                                                                })()}
                                                            </td>
                                                            {/* No. of Packages */}
                                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                                                                {item.packages ? (
                                                                    item.packages.split(',').map((pkg: string, idx: number) => (
                                                                        <div key={idx}>{pkg.trim()}</div>
                                                                    ))
                                                                ) : '-'}
                                                            </td>
                                                            {/* Delivery Details */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-gray-900">{item.delivery_contact_name || '-'}</span>
                                                                    <span className="text-xs text-gray-500">{item.delivery_contact_phone || '-'}</span>
                                                                </div>
                                                            </td>
                                                            {/* Date */}
                                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {new Date(item.clearance_date).toLocaleDateString()}
                                                                </div>
                                                            </td>

                                                            <td className="py-4 px-6 text-center">
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                )}

                                                                {hasRole('Administrator') && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors ml-2"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Other Ports / Unassigned */}
                            {(() => {
                                const otherSchedules = schedules.filter(s => !['MALE', 'HULHUMALE', 'MALE AIRPORT', 'ADDU'].includes((s.port || '').toUpperCase()));
                                if (otherSchedules.length === 0) return null;

                                return (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-800 uppercase tracking-wide">Other Ports</h3>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-200/50 px-2 py-1 rounded-full">{otherSchedules.length} Clearances</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[1000px]">
                                                <thead>
                                                    <tr className="bg-black text-white">
                                                        {isDeliveryNoteMode && (
                                                            <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[50px]">Select</th>
                                                        )}
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Shipment</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[180px]">Consignee</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Method</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">BL No.</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">Customs R</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">C Number</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Container</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[80px]">Size</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Weight</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Packages</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Delivery details</th>
                                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Date</th>
                                                        <th className="py-4 px-6 text-center text-xs font-bold uppercase tracking-wider w-[80px]">Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {otherSchedules.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''}`}
                                                            onClick={() => {
                                                                if (isDeliveryNoteMode) {
                                                                    handleSelectSchedule(item.id);
                                                                } else {
                                                                    setSelectedSchedule(item);
                                                                }
                                                            }}
                                                        >
                                                            {isDeliveryNoteMode && (
                                                                <td className="py-4 px-6 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedIds.includes(item.id)}
                                                                        onChange={() => handleSelectSchedule(item.id)}
                                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </td>
                                                            )}
                                                            {/* Job */}
                                                            <td className="py-4 px-6 text-sm font-semibold text-indigo-600 group/job">
                                                                <div
                                                                    className="flex items-center gap-2 cursor-pointer hover:text-indigo-800 transition-colors"
                                                                    onClick={(e) => handleShipmentClick(item.job_id, e)}
                                                                >
                                                                    {item.job_id}
                                                                    {item.reschedule_reason && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700" title={`Reason: ${item.reschedule_reason}`}>Rescheduled</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-normal">{new Date(item.job?.created_at || item.created_at).toLocaleDateString()}</div>
                                                            </td>
                                                            {/* Consignee */}
                                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                                                                {item.consignee || 'Unknown'}
                                                            </td>
                                                            {/* Method */}
                                                            <td className="py-4 px-6 text-sm text-gray-600 uppercase">
                                                                {item.clearance_method || '-'}
                                                            </td>
                                                            {/* BL No. */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {item.bl_awb || '-'}
                                                            </td>
                                                            {/* Customs R Number */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {(() => {
                                                                    const job = shipmentsList.find((s: any) => s.id === item.job_id);
                                                                    return job?.customs_r_form || item.customs_r_form || item.job?.customs_r_form || '-';
                                                                })()}
                                                            </td>
                                                            {/* C Number */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {(() => {
                                                                    const consigneeName = item.consignee || '';
                                                                    const matchedConsignee = consigneesList.find((c: any) => c.name?.toLowerCase() === consigneeName.toLowerCase());
                                                                    return matchedConsignee?.c_number || item.c_number || item.job?.c_number || '-';
                                                                })()}
                                                            </td>
                                                            {/* Container No. */}
                                                            <td className="py-4 px-6 text-sm text-gray-600 font-mono">
                                                                {item.container_no ? (
                                                                    item.container_no.split(',').map((no: string, idx: number) => (
                                                                        <div key={idx}>{no.trim()}</div>
                                                                    ))
                                                                ) : '-'}
                                                            </td>
                                                            {/* Size */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {item.container_type ? (
                                                                    item.container_type.split(',').map((type: string, idx: number) => (
                                                                        <div key={idx}>{type.trim()}</div>
                                                                    ))
                                                                ) : '-'}
                                                            </td>
                                                            {/* Gross Weight */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                {(() => {
                                                                    const job = shipmentsList.find((s: any) => s.id === item.job_id);
                                                                    const blWeight = getWeightFromJobBL(job, item.bl_awb);
                                                                    if (blWeight !== null) return blWeight;
                                                                    return formatWeight(item.weight || item.gross_weight || job?.weight || item.job?.weight);
                                                                })()}
                                                            </td>
                                                            {/* No. of Packages */}
                                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                                                                {item.packages ? (
                                                                    item.packages.split(',').map((pkg: string, idx: number) => (
                                                                        <div key={idx}>{pkg.trim()}</div>
                                                                    ))
                                                                ) : '-'}
                                                            </td>
                                                            {/* Delivery Details */}
                                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-gray-900">{item.delivery_contact_name || '-'}</span>
                                                                    <span className="text-xs text-gray-500">{item.delivery_contact_phone || '-'}</span>
                                                                </div>
                                                            </td>
                                                            {/* Date */}
                                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {new Date(item.clearance_date).toLocaleDateString()}
                                                                </div>
                                                            </td>

                                                            <td className="py-4 px-6 text-center">
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                )}

                                                                {hasRole('Administrator') && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors ml-2"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {schedules.length === 0 && (
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-12 text-center text-gray-500">
                                    No scheduled clearances found.
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Drawer for Editing/Creating */}
                {isDrawerOpen && (
                    <ScheduleClearanceDrawer
                        isOpen={isDrawerOpen}
                        onClose={() => { setIsDrawerOpen(false); setEditingSchedule(null); }}
                        onSave={handleSave}
                        initialData={editingSchedule}
                        job={editingSchedule}
                        isReschedule={!!editingSchedule}

                    />
                )}

                {/* Drawer for Viewing Details */}
                {selectedSchedule && (
                    <ClearanceDetailsDrawer
                        isOpen={!!selectedSchedule}
                        onClose={() => setSelectedSchedule(null)}
                        schedule={selectedSchedule}
                        onReschedule={canEdit ? (schedule) => {
                            setSelectedSchedule(null);
                            handleEditClick(schedule);
                        } : undefined}
                    />
                )}

                {/* Drawer for Delivery Note */}
                <DeliveryNoteDrawer
                    isOpen={isDeliveryDrawerOpen}
                    onClose={() => setIsDeliveryDrawerOpen(false)}
                    selectedSchedules={getSelectedSchedules()}
                    onSave={handleDeliveryNoteSave}
                />
            </div>
        </Layout >
    );
};

export default ClearanceSchedule;
