
import React, { useState, useEffect } from 'react';
import { Trash2, Search, X, Edit2, FileUp } from 'lucide-react';
import { paymentItemsAPI, vendorsAPI } from '../../services/api';

const PaymentItemsSettings: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [importing, setImporting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        vendor_id: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [itemsRes, vendorsRes] = await Promise.all([
                paymentItemsAPI.getAll(),
                vendorsAPI.getAll()
            ]);
            setItems(itemsRes.data);
            setVendors(vendorsRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchPaymentItems = async () => {
        try {
            const res = await paymentItemsAPI.getAll();
            setItems(res.data);
        } catch (error) {
            console.error('Failed to fetch payment items', error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                vendor_id: formData.vendor_id ? formData.vendor_id : null // Handle 'unassigned' logic if empty
            };

            if (editingId) {
                await paymentItemsAPI.update(editingId, payload);
            } else {
                await paymentItemsAPI.create(payload);
            }
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', vendor_id: '' });
            fetchPaymentItems();
        } catch (error) {
            console.error('Failed to save payment item', error);
            alert('Failed to save payment item');
        }
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setFormData({
            name: item.name || '',
            vendor_id: item.vendor_id || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this payment item?')) return;
        try {
            await paymentItemsAPI.delete(id);
            fetchPaymentItems();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', vendor_id: '' });
    };

    const filteredItems = items.filter(item =>
        item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getVendorName = (vendorId: string | number) => {
        if (!vendorId) return 'Unassigned';
        const vendor = vendors.find(v => v.id == vendorId); // loose comparison for string/number id differences
        return vendor ? vendor.name : 'Unassigned';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            setImporting(true);
            const res = await paymentItemsAPI.import(formData);
            alert(res.data.message || 'Import successful');
            if (res.data.errors) {
                console.warn('Import warnings:', res.data.errors);
                alert(`Import completed with errors:\n${res.data.errors.join('\n')}`);
            }
            fetchPaymentItems();
        } catch (error: any) {
            console.error('Import failed', error);
            alert('Import failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setImporting(false);
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white font-sans">
            {/* Header Section */}
            <div className="px-10 py-8 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment Items</h1>
                    <p className="text-gray-500 mt-1 text-sm">Standardize payable line items and link them to vendors</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Import/Delete Actions moved here to keep search area clean like screenshot */}
                    <label className={`px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-full cursor-pointer hover:bg-gray-50 transition-colors text-sm flex items-center gap-2 ${importing ? 'opacity-50 cursor-wait' : ''}`}>
                        <FileUp className="w-4 h-4" />
                        {importing ? 'Importing...' : 'Import Excel'}
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={importing} />
                    </label>
                    <button
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to DELETE ALL payment items? This action cannot be undone.')) {
                                try {
                                    await paymentItemsAPI.deleteAll();
                                    fetchPaymentItems();
                                    alert('All payment items deleted successfully');
                                } catch (error) {
                                    console.error('Failed to delete all', error);
                                    alert('Failed to delete all items');
                                }
                            }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete All Items"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', vendor_id: '' });
                            setShowModal(true);
                        }}
                        className="px-6 py-2.5 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors text-sm"
                    >
                        Create Payment Item
                    </button>
                </div>
            </div>

            {/* Search Section */}
            <div className="px-10 mb-8 max-w-4xl">
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                    SEARCH PAYMENT ITEMS
                </label>
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by item name or vendor"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Showing {filteredItems.length} of {items.length} payment items
                </p>
            </div>

            {/* Table Section */}
            <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading payment items......</div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-xl">
                        <p className="text-gray-500">No payment items found.</p>
                    </div>
                ) : (
                    <div className="w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs font-semibold tracking-wider">
                                    <th className="py-4 px-6 rounded-tl-lg">Payment Item</th>
                                    <th className="py-4 px-6">Vendor</th>
                                    <th className="py-4 px-6 w-32 rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group border-b border-gray-50 last:border-none">
                                        <td className="py-6 px-6 text-sm font-medium text-gray-900">
                                            {item.name}
                                        </td>
                                        <td className="py-6 px-6 text-sm">
                                            {item.vendor_id ? (
                                                <span className="text-gray-700">{getVendorName(item.vendor_id)}</span>
                                            ) : (
                                                <span className="text-blue-500 font-medium">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="w-8 h-8 rounded-full border border-blue-200 text-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="w-8 h-8 rounded-md border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900">Payment Item</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm text-gray-700 appearance-none cursor-pointer"
                                        value={formData.vendor_id}
                                        onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                                    >
                                        <option value="">Select a vendor</option>
                                        {vendors.map(vendor => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.name} {vendor.company_name ? `(${vendor.company_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Item Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 text-gray-500 font-medium hover:bg-gray-50 rounded-lg transition-colors text-sm border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-[#0284c7] text-white font-medium rounded-full hover:bg-[#0369a1] transition-colors shadow-sm text-sm"
                                >
                                    {editingId ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentItemsSettings;
