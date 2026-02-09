import React, { useState, useEffect } from 'react';
import { Anchor, Plus, Trash2, Search, X, Edit2 } from 'lucide-react';
import { vesselsAPI } from '../../services/api';

const VesselsSettings: React.FC = () => {
    const [vessels, setVessels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        registry_number: '',
        type: 'Dhoni',
        owner_number: '',
        captain_number: ''
    });

    const fetchVessels = async () => {
        try {
            setLoading(true);
            const response = await vesselsAPI.getAll();
            setVessels(response.data);
        } catch (error) {
            console.error('Failed to fetch vessels', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVessels();
    }, []);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await vesselsAPI.update(editingId, formData);
            } else {
                await vesselsAPI.create(formData);
            }
            setShowAddModal(false);
            setEditingId(null);
            setFormData({ name: '', registry_number: '', type: 'Dhoni', owner_number: '', captain_number: '' });
            fetchVessels();
        } catch (error) {
            console.error('Failed to save vessel', error);
            alert('Failed to save vessel');
        }
    };

    const handleEdit = (vessel: any) => {
        setEditingId(vessel.id);
        setFormData({
            name: vessel.name || '',
            registry_number: vessel.registry_number || '',
            type: vessel.type || 'Dhoni',
            owner_number: vessel.owner_number || '',
            captain_number: vessel.captain_number || ''
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ name: '', registry_number: '', type: 'Dhoni', owner_number: '', captain_number: '' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this vessel?')) return;
        try {
            await vesselsAPI.delete(id);
            fetchVessels();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const filteredVessels = vessels.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.registry_number && v.registry_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            <div className="px-8 py-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Vessels</h1>
                    <p className="text-gray-500 mt-1">Manage your vessel fleet</p>
                </div>
            </div>

            <div className="px-8 mb-6 flex justify-between items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search vessels..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-black/5"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', registry_number: '', type: 'Dhoni', owner_number: '', captain_number: '' });
                            setShowAddModal(true);
                        }}
                        className="px-4 py-2 bg-[#FCD34D] text-black font-semibold rounded-lg shadow-sm hover:bg-[#FBBF24] transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Vessel
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading vessels...</div>
                ) : filteredVessels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Anchor className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No vessels found</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Get started by adding a vessel manually.
                        </p>
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-semibold">Name</th>
                                    <th className="py-3 px-4 font-semibold">Registry No.</th>
                                    <th className="py-3 px-4 font-semibold">Type</th>
                                    <th className="py-3 px-4 font-semibold">Owner No.</th>
                                    <th className="py-3 px-4 font-semibold">Captain No.</th>
                                    <th className="py-3 px-4 font-semibold w-24 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredVessels.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group text-sm">
                                        <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">{item.registry_number || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600">{item.type || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono">{item.owner_number || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono">{item.captain_number || '-'}</td>
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
                            <h3 className="font-bold text-lg text-gray-900">{editingId ? 'Edit Vessel' : 'Add New Vessel'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel Name *</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Sea Star"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registry Number</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                    value={formData.registry_number}
                                    onChange={e => setFormData({ ...formData, registry_number: e.target.value })}
                                    placeholder="e.g. REG-12345"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all bg-white"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Dhoni">Dhoni</option>
                                    <option value="Landing Craft">Landing Craft</option>
                                    <option value="Speed Boat">Speed Boat</option>
                                    <option value="Barge">Barge</option>
                                    <option value="Tug">Tug</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Number</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                    value={formData.owner_number}
                                    onChange={e => setFormData({ ...formData, owner_number: e.target.value })}
                                    placeholder="Contact Number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Captain Number</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                    value={formData.captain_number}
                                    onChange={e => setFormData({ ...formData, captain_number: e.target.value })}
                                    placeholder="Contact Number"
                                />
                            </div>
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
                                    {editingId ? 'Save Changes' : 'Create Vessel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VesselsSettings;
