import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    ArrowLeft, Package, MapPin, Calendar, Truck,
    FileText, Download, DollarSign, Scale, Box,
    Edit, Save, X
} from 'lucide-react';

const ShipmentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    // const { user } = useAuth(); // Not using role check for now, simplifying access

    const [shipment, setShipment] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchShipment();
    }, [id]);

    const fetchShipment = async () => {
        try {
            if (!id) return;
            const response = await shipmentsAPI.getById(id);
            setShipment(response.data);
            setFormData(response.data);
        } catch (err) {
            console.error('Error fetching shipment:', err);
            setError('Failed to load shipment details');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            const response = await shipmentsAPI.update(id, formData);
            setShipment(response.data);
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating shipment:', err);
            alert('Failed to update shipment');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </Layout>
        );
    }

    if (error || !shipment) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-4">{error || 'Shipment not found'}</p>
                    <button onClick={() => navigate('/shipments')} className="btn-primary">
                        Back to Shipments
                    </button>
                </div>
            </Layout>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Processing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'In Transit': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Delivered': return 'bg-green-100 text-green-800 border-green-200';
            case 'Delayed': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/shipments')}
                            className="flex items-center text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Shipments
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            {id}
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(shipment.status)}`}>
                                {shipment.status}
                            </span>
                        </h1>
                    </div>

                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData(shipment); // Reset
                                    }}
                                    className="btn-secondary flex items-center gap-2"
                                    disabled={saving}
                                >
                                    <X className="w-4 h-4" /> Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn-primary flex items-center gap-2"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" /> Edit Shipment
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - Left Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Route Info */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <MapPin className="w-5 h-5 text-primary-600 mr-2" />
                                Route Details
                            </h3>
                            <div className="relative pl-8 border-l-2 border-dashed border-gray-300 space-y-8">
                                {/* Pickup */}
                                <div className="relative">
                                    <div className="absolute -left-[41px] bg-primary-100 p-2 rounded-full border border-primary-200">
                                        <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-500">Pickup (Sender)</p>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    name="sender_name"
                                                    value={formData.sender_name || ''}
                                                    onChange={handleInputChange}
                                                    className="input-field"
                                                    placeholder="Sender Name"
                                                />
                                                <textarea
                                                    name="sender_address"
                                                    value={formData.sender_address || ''}
                                                    onChange={handleInputChange}
                                                    className="input-field"
                                                    rows={2}
                                                    placeholder="Sender Address"
                                                />
                                                <input
                                                    type="date"
                                                    name="date"
                                                    value={formData.date ? formData.date.split('T')[0] : ''}
                                                    onChange={handleInputChange}
                                                    className="input-field"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <h4 className="text-lg font-semibold text-gray-900">{shipment.sender_name || shipment.customer}</h4>
                                                <p className="text-gray-600 whitespace-pre-line">{shipment.sender_address || shipment.origin}</p>
                                                <p className="text-sm text-gray-500 mt-2 flex items-center">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    {new Date(shipment.date).toLocaleDateString()}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Delivery */}
                                <div className="relative">
                                    <div className="absolute -left-[41px] bg-accent-100 p-2 rounded-full border border-accent-200">
                                        <div className="w-3 h-3 bg-accent-600 rounded-full"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-500">Delivery (Receiver)</p>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    name="receiver_name"
                                                    value={formData.receiver_name || ''}
                                                    onChange={handleInputChange}
                                                    className="input-field"
                                                    placeholder="Receiver Name"
                                                />
                                                <textarea
                                                    name="receiver_address"
                                                    value={formData.receiver_address || ''}
                                                    onChange={handleInputChange}
                                                    className="input-field"
                                                    rows={2}
                                                    placeholder="Receiver Address"
                                                />
                                                <input
                                                    type="date"
                                                    name="expected_delivery_date"
                                                    value={formData.expected_delivery_date ? formData.expected_delivery_date.split('T')[0] : ''}
                                                    onChange={handleInputChange}
                                                    className="input-field"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <h4 className="text-lg font-semibold text-gray-900">{shipment.receiver_name || 'N/A'}</h4>
                                                <p className="text-gray-600 whitespace-pre-line">{shipment.receiver_address || shipment.destination}</p>
                                                {shipment.expected_delivery_date && (
                                                    <p className="text-sm text-gray-500 mt-2 flex items-center">
                                                        <Calendar className="w-4 h-4 mr-1" />
                                                        Expected: {new Date(shipment.expected_delivery_date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipment Specs */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Package className="w-5 h-5 text-primary-600 mr-2" />
                                Shipment Specifications
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1 flex items-center"><Scale className="w-3 h-3 mr-1" /> Weight (kg)</p>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            name="weight"
                                            value={formData.weight || ''}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        />
                                    ) : (
                                        <p className="font-semibold">{shipment.weight} kg</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1 flex items-center"><Box className="w-3 h-3 mr-1" /> Dimensions</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="dimensions"
                                            value={formData.dimensions || ''}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        />
                                    ) : (
                                        <p className="font-semibold">{shipment.dimensions || 'N/A'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1 flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Value</p>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price || ''}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        />
                                    ) : (
                                        <p className="font-semibold">${shipment.price || '0.00'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1 flex items-center"><Truck className="w-3 h-3 mr-1" /> Transport</p>
                                    {isEditing ? (
                                        <select
                                            name="transport_mode"
                                            value={formData.transport_mode || 'Road'}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        >
                                            <option value="Road">Road</option>
                                            <option value="Air">Air</option>
                                            <option value="Sea">Sea</option>
                                        </select>
                                    ) : (
                                        <p className="font-semibold">{shipment.transport_mode || 'Road'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t">
                                <p className="text-sm text-gray-500 mb-2">Description</p>
                                {isEditing ? (
                                    <textarea
                                        name="description"
                                        value={formData.description || ''}
                                        onChange={handleInputChange}
                                        className="input-field"
                                        rows={3}
                                    />
                                ) : (
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {shipment.description || 'No description provided.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Content - Right Column */}
                    <div className="space-y-6">
                        {/* Status & Tracking */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Status & Tracking</h3>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            name="status"
                                            value={formData.status || 'New'}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        >
                                            <option value="New">New</option>
                                            <option value="Processing">Processing</option>
                                            <option value="In Transit">In Transit</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Delayed">Delayed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                                        <input
                                            type="number"
                                            name="progress"
                                            min="0"
                                            max="100"
                                            value={formData.progress || 0}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center mb-6">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845
                                                a 15.9155 15.9155 0 0 1 0 31.831
                                                a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="#E5E7EB"
                                                strokeWidth="3"
                                            />
                                            <path
                                                d="M18 2.0845
                                                a 15.9155 15.9155 0 0 1 0 31.831
                                                a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="#7E3AF2"
                                                strokeWidth="3"
                                                strokeDasharray={`${shipment.progress}, 100`}
                                                className="animate-chart-grow"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-2xl font-bold text-gray-900">{shipment.progress}%</span>
                                            <span className="text-xs text-gray-500">Completed</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 space-y-4 pt-4 border-t">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Estimated Delivery</span>
                                    <span className="font-medium text-gray-900">
                                        {shipment.expected_delivery_date ? new Date(shipment.expected_delivery_date).toLocaleDateString() : 'TBD'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle & Driver Info */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Truck className="w-5 h-5 text-primary-600 mr-2" />
                                Vehicle & Driver
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Assigned Driver</label>
                                    {isEditing ? (
                                        <input
                                            name="driver"
                                            value={formData.driver || ''}
                                            onChange={handleInputChange}
                                            className="input-field"
                                            placeholder="Driver Name"
                                        />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{shipment.driver || 'Pending Assignment'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Vehicle ID / Plate</label>
                                    {isEditing ? (
                                        <input
                                            name="vehicle_id"
                                            value={formData.vehicle_id || ''}
                                            onChange={handleInputChange}
                                            className="input-field"
                                            placeholder="Vehicle Plate No."
                                        />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{shipment.vehicle_id || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 text-primary-600 mr-2" />
                                Documents
                            </h3>

                            {shipment.documents && shipment.documents.length > 0 ? (
                                <div className="space-y-3">
                                    {shipment.documents.map((doc: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center min-w-0 gap-3">
                                                <div className="p-2 bg-white rounded-md border border-gray-200">
                                                    <FileText className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                                                    <p className="text-xs text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <a
                                                href={`http://localhost:5001/${doc.file_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed">
                                    No documents attached
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ShipmentDetails;
