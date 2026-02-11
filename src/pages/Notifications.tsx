import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { notificationsAPI } from '../services/api';
import { Bell, Check, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationsAPI.getAll();
            setNotifications(response.data);
            setSelectedIds([]); // Clear selection on refresh
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationsAPI.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };



    const handleDeleteSelected = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} selected notifications?`)) return;
        try {
            await notificationsAPI.deleteBatch(selectedIds);
            setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to delete selected', error);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(notifications.map(n => n.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleClick = async (notification: any) => {
        // Only mark read/navigate if not clicking checkbox or delete actions
        if (!notification.is_read) {
            await handleMarkAsRead(notification.id);
        }

        // Navigate based on entity type if available
        if (notification.entity_type === 'SHIPMENT' && notification.entity_id) {
            navigate(`/registry?selectedJobId=${notification.entity_id}`);
        } else if (notification.link) {
            if (notification.link.startsWith('/')) {
                navigate(notification.link);
            } else {
                navigate(`/${notification.link}`);
            }
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="w-6 h-6" />
                        Notifications
                    </h1>

                    <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                            <>
                                {selectedIds.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100 flex items-center gap-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete ({selectedIds.length})
                                    </button>
                                )}

                                {notifications.some(n => !n.is_read) && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-sm flex items-center gap-1"
                                    >
                                        <Check className="w-4 h-4" />
                                        Mark all read
                                    </button>
                                )}


                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
                        <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
                        <p className="text-gray-500">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        {/* Header for Select All */}
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-4">
                            <input
                                type="checkbox"
                                className="rounded text-blue-600 focus:ring-blue-500"
                                checked={selectedIds.length === notifications.length && notifications.length > 0}
                                onChange={handleSelectAll}
                            />
                            <span className="text-xs font-semibold text-gray-500 uppercase">
                                {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Select All'}
                            </span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`
                                        flex items-start gap-4 p-4 transition-colors hover:bg-gray-50
                                        ${notification.is_read ? 'bg-white' : 'bg-blue-50/50'}
                                    `}
                                >
                                    <div className="pt-1">
                                        <input
                                            type="checkbox"
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                            checked={selectedIds.includes(notification.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleSelect(notification.id);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>

                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => handleClick(notification)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`font-medium mb-0.5 ${!notification.is_read ? 'text-blue-700' : 'text-gray-800'}`}>
                                                    {notification.title}
                                                    {!notification.is_read && (
                                                        <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                                                    )}
                                                </h4>
                                                <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            {notification.link && (
                                                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Notifications;
