import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { shipmentsAPI, exportersAPI, vendorsAPI } from '../services/api';
import { Upload, X, Save, ArrowLeft, FileText, Truck, Anchor, Plane } from 'lucide-react';

const CreateShipment: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [exporters, setExporters] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [expRes, vendRes] = await Promise.all([
                    exportersAPI.getAll(),
                    vendorsAPI.getAll()
                ]);
                setExporters(expRes.data);
                setVendors(vendRes.data);
            } catch (err) {
                console.error("Failed to fetch dropdown data", err);
            }
        };
        fetchData();
    }, []);

    // Form State
    const [formData, setFormData] = useState({
        sender_name: '',
        sender_address: '',
        receiver_name: '',
        receiver_address: '',
        description: '',
        weight: '',
        dimensions: '', // LxWxH
        price: '', // Value
        date: '', // Pickup Date
        expected_delivery_date: '',
        transport_mode: 'Road'
    });

    // Document State
    const [documents, setDocuments] = useState<{
        invoice: File | null;
        packing_list: File | null;
        transport_doc: File | null;
    }>({
        invoice: null,
        packing_list: null,
        transport_doc: null
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Auto-fill address for Exporter
        if (name === 'sender_name') {
            const exporter = exporters.find(ex => ex.name === value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                sender_address: exporter ? exporter.address : prev.sender_address
            }));
            return;
        }

        // Auto-fill address for Vendor
        if (name === 'receiver_name') {
            const vendor = vendors.find(v => v.name === value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                receiver_address: vendor ? vendor.address : prev.receiver_address
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof documents) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validation: Size < 10MB
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Max size is 10MB.`);
                return;
            }
            // Validation: Type PDF/JPEG
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert(`Invalid file type for ${file.name}. Only PDF and JPEG/PNG allowed.`);
                return;
            }

            setDocuments(prev => ({ ...prev, [type]: file }));
        }
    };

    const removeFile = (type: keyof typeof documents) => {
        setDocuments(prev => ({ ...prev, [type]: null }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation: Dates
            if (new Date(formData.date) > new Date(formData.expected_delivery_date)) {
                alert('Pickup date cannot be after expected delivery date');
                setLoading(false);
                return;
            }

            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value);
            });

            // Append specific documents with specific keys
            if (documents.invoice) data.append('invoice', documents.invoice);
            if (documents.packing_list) data.append('packing_list', documents.packing_list);
            if (documents.transport_doc) data.append('transport_doc', documents.transport_doc);

            await shipmentsAPI.create(data);
            navigate('/shipments');
        } catch (error) {
            console.error('Error creating shipment:', error);
            alert('Failed to create shipment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getTransportIcon = () => {
        switch (formData.transport_mode) {
            case 'Sea': return <Anchor className="w-5 h-5 text-blue-500" />;
            case 'Air': return <Plane className="w-5 h-5 text-sky-500" />;
            default: return <Truck className="w-5 h-5 text-green-500" />;
        }
    };

    const getTransportDocLabel = () => {
        if (formData.transport_mode === 'Sea') return 'Bill of Lading (BL) (Optional)';
        if (formData.transport_mode === 'Air') return 'Airway Bill (AWB) (Optional)';
        return 'Transport Document (Optional)';
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Shipment</h1>
                        <p className="text-gray-500 mt-1">Fill in the details below to register a new clearance job.</p>
                    </div>
                    <button
                        onClick={() => navigate('/shipments')}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Shipments
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form Area */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Parties Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800">Parties Involved</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Exporter */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Exporter Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Exporter Name *</label>
                                        <select
                                            name="sender_name"
                                            required
                                            value={formData.sender_name}
                                            onChange={handleChange}
                                            className="input-field appearance-none"
                                        >
                                            <option value="">Select Exporter</option>
                                            {exporters.map(ex => (
                                                <option key={ex.id} value={ex.name}>{ex.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                        <textarea
                                            name="sender_address"
                                            required
                                            rows={3}
                                            value={formData.sender_address}
                                            onChange={handleChange}
                                            className="input-field resize-none"
                                            placeholder="Full Address"
                                        />
                                    </div>
                                </div>

                                {/* Vendor */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Vendor Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                                        <select
                                            name="receiver_name"
                                            required
                                            value={formData.receiver_name}
                                            onChange={handleChange}
                                            className="input-field appearance-none"
                                        >
                                            <option value="">Select Vendor</option>
                                            {vendors.map(v => (
                                                <option key={v.id} value={v.name}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                        <textarea
                                            name="receiver_address"
                                            required
                                            rows={3}
                                            value={formData.receiver_address}
                                            onChange={handleChange}
                                            className="input-field resize-none"
                                            placeholder="Full Address"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cargo Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <Truck className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800">Cargo Details</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Description *</label>
                                    <textarea
                                        name="description"
                                        required
                                        rows={2}
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="Detailed description of goods"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
                                        <input
                                            type="number"
                                            name="weight"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={formData.weight}
                                            onChange={handleChange}
                                            className="input-field"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (LxWxH) *</label>
                                        <input
                                            type="text"
                                            name="dimensions"
                                            required
                                            value={formData.dimensions}
                                            onChange={handleChange}
                                            className="input-field"
                                            placeholder="e.g. 100x50x50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Value (USD) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                name="price"
                                                required
                                                step="0.01"
                                                min="0"
                                                value={formData.price}
                                                onChange={handleChange}
                                                className="input-field pl-7"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Logistics & Docs */}
                    <div className="space-y-6">
                        {/* Logistics */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-4">Logistics</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Transport *</label>
                                    <div className="relative">
                                        <select
                                            name="transport_mode"
                                            value={formData.transport_mode}
                                            onChange={handleChange}
                                            className="input-field pl-10 appearance-none"
                                        >
                                            <option value="Road">Road</option>
                                            <option value="Air">Air</option>
                                            <option value="Sea">Sea</option>
                                        </select>
                                        <div className="absolute left-3 top-2.5">
                                            {getTransportIcon()}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery *</label>
                                    <input
                                        type="date"
                                        name="expected_delivery_date"
                                        required
                                        value={formData.expected_delivery_date}
                                        onChange={handleChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-4">Required Documents</h2>

                            {/* Invoice Upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Commercial Invoice (Optional)</label>
                                {!documents.invoice ? (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            id="invoice_upload"
                                            onChange={(e) => handleFileChange(e, 'invoice')}
                                            className="hidden"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                        />
                                        <label htmlFor="invoice_upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                            <span className="text-xs text-gray-500">Upload PDF/Image</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                        <span className="text-xs text-indigo-700 truncate max-w-[150px]">{documents.invoice.name}</span>
                                        <button type="button" onClick={() => removeFile('invoice')} className="text-indigo-400 hover:text-indigo-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Packing List Upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Packing List (Optional)</label>
                                {!documents.packing_list ? (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            id="pl_upload"
                                            onChange={(e) => handleFileChange(e, 'packing_list')}
                                            className="hidden"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                        />
                                        <label htmlFor="pl_upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                            <span className="text-xs text-gray-500">Upload PDF/Image</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                        <span className="text-xs text-indigo-700 truncate max-w-[150px]">{documents.packing_list.name}</span>
                                        <button type="button" onClick={() => removeFile('packing_list')} className="text-indigo-400 hover:text-indigo-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Transport Doc Upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">{getTransportDocLabel()}</label>
                                {!documents.transport_doc ? (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            id="td_upload"
                                            onChange={(e) => handleFileChange(e, 'transport_doc')}
                                            className="hidden"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                        />
                                        <label htmlFor="td_upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                            <span className="text-xs text-gray-500">Upload PDF/Image</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                        <span className="text-xs text-indigo-700 truncate max-w-[150px]">{documents.transport_doc.name}</span>
                                        <button type="button" onClick={() => removeFile('transport_doc')} className="text-indigo-400 hover:text-indigo-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? (
                                    <span>Processing...</span>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Create Shipment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default CreateShipment;
