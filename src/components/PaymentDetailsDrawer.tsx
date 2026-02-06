import React from 'react';
import { X, Receipt, Check, Pencil } from 'lucide-react';
import { paymentsAPI } from '../services/api';

interface PaymentDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    payment: any;
}

const PaymentDetailsDrawer: React.FC<PaymentDetailsDrawerProps> = ({ isOpen, onClose, payment }) => {
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editAmount, setEditAmount] = React.useState('');
    const [items, setItems] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (payment) {
            setItems(Array.isArray(payment) ? payment : [payment]);
        }
    }, [payment]);

    if (!isOpen || !items.length) return null;

    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);

    const handleEditClick = (item: any) => {
        setEditingId(item.id);
        setEditAmount(item.amount);
    };

    const handleSave = async (id: string) => {
        try {
            await paymentsAPI.update(id, { amount: editAmount });
            setItems(prev => prev.map(item => item.id === id ? { ...item, amount: editAmount } : item));
            setEditingId(null);
        } catch (error) {
            console.error(error);
            alert('Failed to update amount');
        }
    };

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-MV', { style: 'currency', currency: 'MVR' }).format(Number(amount));
    };


    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 max-w-md w-full flex animate-slide-in-right">
                <div className="h-full w-full bg-white shadow-2xl flex flex-col">

                    {/* Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* Payment Items */}
                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-gray-900 mb-4">Payment Items</h4>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={item.id || index} className="py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors rounded-lg px-2">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                                <Receipt className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-xs font-medium text-gray-500">{item.job_id}</span>
                                                    <span className="text-sm font-medium text-gray-900">{item.payment_type}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {editingId === item.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={editAmount}
                                                            onChange={e => setEditAmount(e.target.value)}
                                                            className="w-24 p-1 text-right text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleSave(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                                                        {(item.status === 'Pending' || item.status === 'Draft') && (
                                                            <button
                                                                onClick={() => handleEditClick(item)}
                                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                                title="Edit Amount"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {item.comments && (
                                            <div className="mt-2 ml-10 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Comments</p>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.comments}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Total */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-base font-medium text-gray-600">Total Payable</span>
                            <span className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                        </div>

                    </div>


                </div>
            </div>
        </div>
    );
};

export default PaymentDetailsDrawer;
