import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Save } from 'lucide-react';

interface ShipmentInvoiceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

const CARGO_TYPES = ['GENERAL', 'PERISHABLE', 'HAZARDOUS', 'FRAGILE', 'REEFER'];
const OFFICES = ['00MP', '00AP', '00HA', '00BW', '00HK', '00HM', '00PO', '00SG', '00SH'];

const ShipmentInvoiceDrawer: React.FC<ShipmentInvoiceDrawerProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<any>({
        invoice_no: '',
        cargo_type: 'GENERAL',
        no_of_pkgs: '',
        customs_r_form: '',
        office: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                invoice_no: initialData?.invoice_no || '',
                cargo_type: initialData?.cargo_type || 'GENERAL',
                no_of_pkgs: initialData?.no_of_pkgs || initialData?.invoice_items || '',
                customs_r_form: initialData?.customs_r_form || '',
                office: initialData?.office || ''
            });
        }
    }, [isOpen]); // Fixed: Only run on open, not when initialData ref updates


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);
        // Do not close immediately, let parent handle it or close here?
        // References show parent handles closing usually, but here we can close after save triggering?
        // Logic in parent closes it? No, handleInvoiceDrawerSave calls setIsInvoiceDrawerOpen(false).
        // onSave(formData);
        // onClose(); // Removing explicit close here might depend on parent, usually parent closes. 
        // But in the existing code it was:
        // onSave(formData);
        // onClose();
        // Since parent refreshes data and closes, we can just call onSave.
        // Actually, let's keep it safe.
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
                <div className="h-full w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Shipment invoice</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipment Invoice Number*</label>
                            <input
                                name="invoice_no"
                                value={formData.invoice_no}
                                onChange={handleInputChange}
                                className="input-field w-full py-2 px-3 border rounded text-sm"
                                placeholder=""
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. Items*</label>
                                <input
                                    type="number"
                                    name="no_of_pkgs"
                                    value={formData.no_of_pkgs}
                                    onChange={handleInputChange}
                                    className="input-field w-full py-2 px-3 border rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo Type*</label>
                                <div className="relative">
                                    <select
                                        name="cargo_type"
                                        value={formData.cargo_type}
                                        onChange={handleInputChange}
                                        className="input-field w-full py-2 px-3 border rounded text-sm appearance-none bg-white"
                                    >
                                        {CARGO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customs R No.</label>
                                <input
                                    name="customs_r_form"
                                    value={formData.customs_r_form}
                                    onChange={handleInputChange}
                                    className="input-field w-full py-2 px-3 border rounded text-sm"
                                    placeholder=""
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Office</label>
                                <div className="relative">
                                    <select
                                        name="office"
                                        value={formData.office}
                                        onChange={handleInputChange}
                                        className="input-field w-full py-2 px-3 border rounded text-sm appearance-none bg-white"
                                    >
                                        <option value="">Select Office</option>
                                        {OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShipmentInvoiceDrawer;
