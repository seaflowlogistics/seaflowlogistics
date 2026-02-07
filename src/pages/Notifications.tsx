import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { notificationsAPI } from '../services/api';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationsAPI.getAll();
            setNotifications(response.data);
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

    const handleClick = async (notification: any) => {
        if (!notification.is_read) {
            await handleMarkAsRead(notification.id);
        }
        if (notification.link) {
            // Check if link is absolute or relative
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
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="w-6 h-6" />
                        Notifications
                    </h1>
                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <Check className="w-4 h-4" />
                            Mark all as read
                        </button>
                    )}
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
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleClick(notification)}
                                className={`
                                    p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md
                                    ${notification.is_read
                                        ? 'bg-white border-gray-100 text-gray-600'
                                        : 'bg-blue-50 border-blue-100 text-gray-900 notification-unread'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h4 className={`font-medium mb-1 ${!notification.is_read && 'text-blue-700'}`}>
                                            {notification.title}
                                            {!notification.is_read && (
                                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                                            )}
                                        </h4>
                                        <p className="text-sm mb-2">{notification.message}</p>
                                        <span className="text-xs text-gray-400">
                                            {new Date(notification.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    {notification.link && (
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Notifications;
