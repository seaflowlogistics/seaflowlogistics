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

    // Pending Jobs State removed

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
                                                            <td className="py-4 px-6 text-sm font-semibold text-indigo-600">
                                                                <div className="flex items-center gap-2">
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
                                                            <td className="py-4 px-6 text-sm font-semibold text-indigo-600">
                                                                <div className="flex items-center gap-2">
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
