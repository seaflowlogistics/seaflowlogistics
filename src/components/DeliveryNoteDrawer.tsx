import React, { useState } from 'react';
import { X, ArrowLeft, Plus } from 'lucide-react';

interface DeliveryNoteDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSchedules: any[];
    onSave: (data: any) => void;
}

const DeliveryNoteDrawer: React.FC<DeliveryNoteDrawerProps> = ({ isOpen, onClose, selectedSchedules, onSave }) => {
    const [step, setStep] = useState(1);
    const [itemDetails, setItemDetails] = useState<Record<string, { shortage: string; damaged: string; remarks: string }>>({});
    const [noteDetails, setNoteDetails] = useState({
        vehicle: '',
        driver: '',
        contact: '',
        location: '',
        loadingDate: '',
        unloadingDate: '',
        comments: ''
    });

    if (!isOpen) return null;

    const handleItemChange = (id: string, field: string, value: string) => {
        setItemDetails(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleNoteChange = (field: string, value: string) => {
        setNoteDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => setStep(2);
    const handleBack = () => setStep(1);

    const handleSave = () => {
        // PERFOM SAVE LOGIC combine all data
        const combinedData = {
            schedules: selectedSchedules.map(s => ({
                id: s.id,
                job_id: s.job_id,
                ...itemDetails[s.id]
            })),
            note: noteDetails
        };
        onSave(combinedData);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-900">Delivery Note</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {selectedSchedules.map(schedule => {
                                const details = itemDetails[schedule.id] || { shortage: '0', damaged: '0', remarks: '' };
                                return (
                                    <div key={schedule.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-3 border-b border-gray-200 pb-2">
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{schedule.job_id}</div>
                                                <div className="text-xs text-gray-500">{schedule.container_no || 'No Container'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900 text-sm">{schedule.packages || 0} PKG</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Shortage</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 bg-white border border-gray-200 rounded text-sm outline-none focus:border-indigo-500"
                                                    value={details.shortage}
                                                    onChange={e => handleItemChange(schedule.id, 'shortage', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Damaged</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 bg-white border border-gray-200 rounded text-sm outline-none focus:border-indigo-500"
                                                    value={details.damaged}
                                                    onChange={e => handleItemChange(schedule.id, 'damaged', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Write your remarks here"
                                                className="w-full p-2 bg-white border border-gray-200 rounded text-sm outline-none focus:border-indigo-500"
                                                value={details.remarks}
                                                onChange={e => handleItemChange(schedule.id, 'remarks', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Vehicle</label>
                                <div className="relative">
                                    <select
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 appearance-none"
                                        value={noteDetails.vehicle}
                                        onChange={e => handleNoteChange('vehicle', e.target.value)}
                                    >
                                        <option value="">Select an option</option>
                                        <option value="Vehicle 1">Vehicle 1</option>
                                        <option value="Vehicle 2">Vehicle 2</option>
                                    </select>
                                    <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-1">
                                    <button className="text-xs flex items-center gap-1 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 font-medium transition-colors">
                                        <Plus className="w-3 h-3" /> Add new vehicle
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Driver / Captain</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                    value={noteDetails.driver}
                                    onChange={e => handleNoteChange('driver', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Driver / Captain Contact</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                    value={noteDetails.contact}
                                    onChange={e => handleNoteChange('contact', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Discharge Location</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                    value={noteDetails.location}
                                    onChange={e => handleNoteChange('location', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Loading Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                    value={noteDetails.loadingDate}
                                    onChange={e => handleNoteChange('loadingDate', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unloading Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                    value={noteDetails.unloadingDate}
                                    onChange={e => handleNoteChange('unloadingDate', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Comments</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 min-h-[100px]"
                                    value={noteDetails.comments}
                                    onChange={e => handleNoteChange('comments', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
                    {step === 2 && (
                        <button onClick={handleBack} className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    {step === 1 ? (
                        <button onClick={handleNext} className="px-6 py-2 bg-indigo-900 text-white font-medium rounded-lg hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-200">
                            Next
                        </button>
                    ) : (
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryNoteDrawer;
