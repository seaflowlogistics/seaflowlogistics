
import React, { useState, useEffect } from 'react';
import { Users, FileUp, Plus, Trash2, Search, X, Edit2 } from 'lucide-react';
import { customersAPI } from '../../services/api';

const CustomersSettings: React.FC = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'Individual' | 'Company'>('Individual');
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'Individual', // Individual | Company
        name: '',
        email: '',
        phone: '',
        address: '',
        code: '', // ID/Passport or Reg No
        gst_tin: ''
    });

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customersAPI.getAll();
            setCustomers(response.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Prepare payload
            // We still append GSTIN to address for storage since we only added 'type', not 'gst_tin' column
            // But we natively send 'type' now.
            const payload = {
                ...formData,
                address: formData.type === 'Company' && formData.gst_tin
                    ? (formData.address.includes('GSTIN:') ? formData.address : `${formData.address}\n\nGSTIN: ${formData.gst_tin}`)
                    : formData.address
            };

            // Ensure address doesn't get duplicate GSTIN appended if editing
            if (formData.type === 'Company' && formData.gst_tin && formData.address.includes('GSTIN:')) {
                // If address already has GSTIN, we might need to update it.
                // Simple regex replace or split/join to update the GSTIN part?
                // For now, let's just assume the user edited the address field directly if they wanted to change it, 
                // or we strip it before re-appending.
                // Safer approach: Extract raw address from current input, append new GSTIN.
                const rawAddress = formData.address.split('GSTIN:')[0].trim();
                payload.address = `${rawAddress}\n\nGSTIN: ${formData.gst_tin}`;
            }

            if (editingId) {
                await customersAPI.update(editingId, payload);
            } else {
                await customersAPI.create(payload);
            }
            setShowAddModal(false);
            setEditingId(null);
            resetForm();
            fetchCustomers();
        } catch (error) {
            console.error('Failed to save customer', error);
            alert('Failed to save customer');
        }
    };

    const handleEdit = (customer: any) => {
        setEditingId(customer.id);

        // Parse Address to extract GSTIN if present
        let address = customer.address || '';
        let gst_tin = '';
        if (address.includes('GSTIN: ')) {
            const parts = address.split('GSTIN: ');
            address = parts[0].trim();
            gst_tin = parts[1].trim();
        }

        // Use native type if available, else infer
        const type = customer.type || (gst_tin ? 'Company' : 'Individual');

        setFormData({
            type,
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            address: address,
            code: customer.code || '',
            gst_tin
        });
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({ type: 'Individual', name: '', email: '', phone: '', address: '', code: '', gst_tin: '' });
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        resetForm();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            setImporting(true);
            const res = await customersAPI.import(formData);
            alert(res.data.message || 'Import successful');
            if (res.data.errors) {
                console.warn('Import warnings:', res.data.errors);
                alert(`Import completed with errors:\n${res.data.errors.join('\n')}`);
            }
            fetchCustomers();
        } catch (error: any) {
            console.error('Import failed', error);
            alert('Import failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setImporting(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;
        try {
            await customersAPI.delete(id);
            fetchCustomers();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()));

        // Filter by Tab/Type
        // Handle migration fallback: if type is missing, treat as Individual unless inferred otherwise?
        // Actually, our migration added default 'Individual', so existing records are 'Individual'.
        // Only records with GSTIN might physically be Companies but labelled Individual.
        // Let's rely on c.type primarily.
        const cType = c.type || 'Individual';
        return matchesSearch && cType === activeTab;
    });

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            <div className="px-8 py-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-500 mt-1">Manage your customer database</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-8 mb-6 border-b border-gray-200 flex gap-6">
                <button
                    onClick={() => setActiveTab('Individual')}
                    className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'Individual' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Individual
                    {activeTab === 'Individual' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('Company')}
                    className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'Company' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Company
                    {activeTab === 'Company' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full" />
                    )}
                </button>
            </div>

            <div className="px-8 mb-6 flex justify-between items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'Individual' ? 'individuals' : 'companies'}...`}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-black/5"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <label className={`px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50 cursor-wait' : ''}`}>
                        <FileUp className="w-4 h-4" />
                        {importing ? 'Importing...' : 'Import Excel'}
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={importing} />
                    </label>

                    <button
                        onClick={() => {
                            setEditingId(null);
                            resetForm();
                            setFormData(prev => ({ ...prev, type: activeTab })); // Pre-select current tab type
                            setShowAddModal(true);
                        }}
                        className="px-4 py-2 bg-[#FCD34D] text-black font-semibold rounded-lg shadow-sm hover:bg-[#FBBF24] transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add {activeTab}
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to DELETE ALL customers? This action cannot be undone.')) {
                                try {
                                    await customersAPI.deleteAll();
                                    fetchCustomers();
                                    alert('All customers deleted successfully');
                                } catch (error) {
                                    console.error('Failed to delete all', error);
                                    alert('Failed to delete all customers');
                                }
                            }
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-lg shadow-sm hover:bg-red-100 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No {activeTab.toLowerCase()}s found</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Get started by adding a new {activeTab.toLowerCase()}.
                        </p>
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-semibold w-1/3">
                                        {activeTab === 'Company' ? 'Company Name' : 'Name'}
                                    </th>
                                    <th className="py-3 px-4 font-semibold">
                                        {activeTab === 'Company' ? 'Reg. No' : 'ID / Passport'}
                                    </th>
                                    <th className="py-3 px-4 font-semibold">Email</th>
                                    <th className="py-3 px-4 font-semibold">Contact</th>
                                    <th className="py-3 px-4 font-semibold w-24 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group text-sm">
                                        <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">{item.code || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600">{item.email || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono">{item.phone || '-'}</td>
                                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-gray-300 hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-gray-300 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">

                            {/* Type Toggle */}
                            <div className="flex p-1 bg-gray-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'Individual' })}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.type === 'Individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Individual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'Company' })}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.type === 'Company' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Company
                                </button>
                            </div>

                            {formData.type === 'Individual' ? (
                                <>
                                    {/* Individual Fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID / Passport Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all font-mono"
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            placeholder="e.g. A1234567"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+1 234..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none h-24"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Home Address..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Company Fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Registered Company Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all font-mono"
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            placeholder="Reg. No."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none h-20"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Headquarters Address..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="company@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="Office Phone"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Tin</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all font-mono"
                                            value={formData.gst_tin}
                                            onChange={e => setFormData({ ...formData, gst_tin: e.target.value })}
                                            placeholder="GSTIN..."
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                                >
                                    {editingId ? 'Save Changes' : 'Create Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersSettings;
