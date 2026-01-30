import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { analyticsAPI, shipmentsAPI, notificationsAPI } from '../services/api';
import {

    Clock,

    CheckCircle,
    AlertCircle,
    Loader2,
    Users,
    ScrollText,
    User,
    Bell,
    UserSearch,
    CreditCard,
    Calendar,
    FileText,
    X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    // const [originalData, setOriginalData] = useState<any>(null);
    const [viewingAll, setViewingAll] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Analytics
                const response = await analyticsAPI.getDashboard();

                // Fetch All Shipments for "Recent" list (Last 24h)
                const shipmentsRes = await shipmentsAPI.getAll();
                const allShipments = shipmentsRes.data || [];

                // 24h Filter
                const oneDayAgo = new Date();
                oneDayAgo.setHours(oneDayAgo.getHours() - 24);

                const recent24h = allShipments.filter((s: any) => {
                    const sDate = s.created_at || s.date;
                    return sDate && new Date(sDate) >= oneDayAgo;
                });

                // Normalize Fields
                const normalized = recent24h.map((s: any) => ({
                    id: s.id,
                    customer: s.customer || s.receiver_name || s.sender_name,
                    destination: s.destination || s.receiver_address || 'N/A',
                    status: s.status || 'Processing',
                    date: s.created_at || s.date
                }));

                // Sort by date desc
                normalized.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setData({ ...response.data, recentShipments: normalized });

                const notifResponse = await notificationsAPI.getAll();
                setNotifications(notifResponse.data);
                setUnreadCount(notifResponse.data.filter((n: any) => !n.is_read).length);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewToggle = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll();
            let allShipments = response.data || [];

            // Normalize fields
            const normalized = allShipments.map((s: any) => ({
                id: s.id,
                customer: s.customer || s.receiver_name || s.sender_name,
                destination: s.destination || s.receiver_address || 'N/A',
                status: s.status || 'Processing',
                date: s.created_at || s.date
            }));

            // Sort by date descending (newest first)
            normalized.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (viewingAll) {
                // View Less: Show only Last 24 Hours
                const oneDayAgo = new Date();
                oneDayAgo.setHours(oneDayAgo.getHours() - 24);

                const filtered24h = normalized.filter((s: any) => new Date(s.date) >= oneDayAgo);

                setData((prev: any) => ({ ...prev, recentShipments: filtered24h }));
                setViewingAll(false);
            } else {
                // View All: Show Everything
                setData((prev: any) => ({ ...prev, recentShipments: normalized }));
                setViewingAll(true);
            }

        } catch (error) {
            console.error('Failed to update shipment view', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </Layout>
        );
    }



    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'In Transit':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Processing':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Delayed':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Delivered':
                return <CheckCircle className="w-4 h-4" />;
            case 'Delayed':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-15 h-15 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md flex-shrink-0">
                            {user?.photo_url ? (
                                <img
                                    src={user.photo_url.startsWith('http') ? user.photo_url : `${import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'}${user.photo_url}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white text-lg font-bold">
                                    {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-6 h-6 text-white" />}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-600 mt-1">Welcome back <span className="font-semibold text-indigo-600">{user?.username}</span>! Here's what's happening today.</p>
                        </div>
                    </div>
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all relative group"
                        >
                            <Bell className={`w-6 h-6 transition-colors ${showNotifications ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-gray-50"></span>
                            )}
                        </button>

                        {/* Notification Drawer */}
                        {showNotifications && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm transition-opacity"
                                    onClick={() => setShowNotifications(false)}
                                ></div>

                                {/* Drawer */}
                                <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col border-l border-gray-100">
                                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-2">
                                            <Bell className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-gray-900 text-lg">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-200">
                                                    {unreadCount} New
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setShowNotifications(false)}
                                            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Actions Bar */}
                                    {notifications.length > 0 && (
                                        <div className="px-5 py-3 border-b border-gray-100 flex justify-end">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await notificationsAPI.markAllRead();
                                                    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                                                    setUnreadCount(0);
                                                }}
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3 h-3" />
                                                Mark all as read
                                            </button>
                                        </div>
                                    )}

                                    {/* List */}
                                    <div className="flex-1 overflow-y-auto p-0">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-400">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <Bell className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="font-medium text-gray-900">All caught up!</p>
                                                <p className="text-sm mt-1">No new notifications for now.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-50">
                                                {notifications.map((notif: any) => (
                                                    <div
                                                        key={notif.id}
                                                        className={`p-5 hover:bg-gray-50 transition-colors relative group ${!notif.is_read ? 'bg-indigo-50/40' : ''}`}
                                                    >
                                                        {!notif.is_read && (
                                                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r"></span>
                                                        )}
                                                        <div className="flex gap-4">
                                                            {/* Icon Placeholder based on context or generic */}
                                                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                <Bell className="w-4 h-4" />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                {/* Admin: Show User Context */}
                                                                {notif.user_name && ['Administrator', 'All'].includes(user?.role || '') && (
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-bold text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">
                                                                            {notif.user_name}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                                                            {notif.user_role}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <p className="text-sm font-semibold text-gray-900 leading-snug">{notif.title}</p>
                                                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notif.message}</p>

                                                                <div className="flex items-center justify-between mt-3">
                                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {new Date(notif.created_at).toLocaleString()}
                                                                    </span>
                                                                    {notif.link && (
                                                                        <Link
                                                                            to={notif.link}
                                                                            onClick={() => setShowNotifications(false)}
                                                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                                                        >
                                                                            View
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-8">
                    {/* Team Snapshot */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Team Snapshot</h2>
                            <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="glass-card p-6 border-l-4 border-red-500">
                                <p className="text-sm text-gray-500 font-medium">Overdue Clearances</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.overdueClearances || 0}</p>
                                <p className="text-xs text-red-500 mt-1 font-semibold">Requires attention</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-blue-500">
                                <p className="text-sm text-gray-500 font-medium">Scheduled Today</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.scheduledToday || 0}</p>
                                <p className="text-xs text-blue-500 mt-1">Created within 24h</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-orange-500">
                                <p className="text-sm text-gray-500 font-medium">Awaiting Delivery Notes</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.awaitingDeliveryNotes || 0}</p>
                                <p className="text-xs text-orange-500 mt-1">Pending documentation</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-green-500">
                                <p className="text-sm text-gray-500 font-medium">Documents Received</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.documentsReceived || 0}</p>
                                <p className="text-xs text-green-500 mt-1">Shared today</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(['Administrator', 'All', 'Accountant', 'Clearance'].includes(user?.role || '') && (
                                <Link to="/registry" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ScrollText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Shipment Registry</h3>
                                    <p className="text-xs text-gray-500 mt-1">Manage shipments and jobs</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All', 'Clearance'].includes(user?.role || '') && (
                                <Link to="/schedule" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Clearance Schedule</h3>
                                    <p className="text-xs text-gray-500 mt-1">Track clearance timelines</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All', 'Accountant', 'Clearance'].includes(user?.role || '') && (
                                <Link to="/delivery-notes" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Delivery Notes</h3>
                                    <p className="text-xs text-gray-500 mt-1">Approve documentation</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All', 'Accountant'].includes(user?.role || '') && (
                                <Link to="/payments" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Payments</h3>
                                    <p className="text-xs text-gray-500 mt-1">Track financial records</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All'].includes(user?.role || '') && (
                                <Link to="/users" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">User Management</h3>
                                    <p className="text-xs text-gray-500 mt-1">Manage system users</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All'].includes(user?.role || '') && (
                                <Link to="/reports" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Reports</h3>
                                    <p className="text-xs text-gray-500 mt-1">View business analytics</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All'].includes(user?.role || '') && (
                                <Link to="/logs" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                        <ScrollText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Audit Logs</h3>
                                    <p className="text-xs text-gray-500 mt-1">Monitor system activity</p>
                                </Link>
                            ))}

                            <Link to="/settings" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <UserSearch className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-900">Information Updates</h3>
                                <p className="text-xs text-gray-500 mt-1">Manage Information</p>
                            </Link>
                        </div>
                    </div>
                </div>






                {/* Recent Shipments */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Shipments</h3>
                        <button
                            onClick={handleViewToggle}
                            className="btn-secondary text-sm"
                        >
                            {viewingAll ? 'View Less' : 'View All'}
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Shipment ID</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>

                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date & Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.recentShipments?.map((shipment: any, index: number) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-100 hover:bg-primary-50/50 transition-colors cursor-pointer"
                                        onClick={() => navigate('/registry', { state: { selectedJobId: shipment.id } })}
                                    >
                                        <td className="py-4 px-4">
                                            <span className="font-mono text-sm font-semibold text-primary-700">{shipment.id}</span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-900">{shipment.customer}</td>

                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(shipment.status)}`}>
                                                {getStatusIcon(shipment.status)}
                                                {shipment.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {new Date(shipment.created_at || shipment.date).toLocaleString(undefined, {
                                                year: 'numeric',
                                                month: 'numeric',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
