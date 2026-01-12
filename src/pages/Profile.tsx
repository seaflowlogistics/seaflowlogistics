import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Monitor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
    const { user } = useAuth();

    // State
    const [profile, setProfile] = useState({
        name: user?.username || 'Thiru',
        email: 'thiru@skyone.mv',
        photo: null as string | null
    });

    const [password, setPassword] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword({ ...password, [e.target.name]: e.target.value });
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-12">

                {/* Page Title */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                </div>

                {/* Section 1: Profile Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Update your account's profile information and email address.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 space-y-6">
                            {/* Photo Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-4 border-white shadow-sm">
                                        {profile.photo ? (
                                            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-2xl font-bold">
                                                {profile.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded shadow-sm hover:bg-purple-700 transition-colors uppercase tracking-wide">
                                            Select A New Photo
                                        </button>
                                        <button className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded shadow-sm hover:bg-purple-700 transition-colors uppercase tracking-wide">
                                            Remove Photo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profile.name}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profile.email}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide">
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200" />

                {/* Section 2: Update Password */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Update Password</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Ensure your account is using a long, random password to stay secure.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    name="current"
                                    value={password.current}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    name="new"
                                    value={password.new}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirm"
                                    value={password.confirm}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide">
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200" />

                {/* Section 3: Two Factor Authentication */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Two Factor Authentication</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Add additional security to your account using two factor authentication.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-2">You have not enabled two factor authentication.</h4>
                            <p className="text-sm text-gray-500 mb-4 max-w-xl">
                                When two factor authentication is enabled, you will be prompted for a secure, random token during authentication. You may retrieve this token from your phone's Google Authenticator application.
                            </p>
                            <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide">
                                Enable
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200" />

                {/* Section 4: Browser Sessions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Browser Sessions</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage and log out your active sessions on other browsers and devices.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-6 max-w-xl">
                                If necessary, you may log out of all of your other browser sessions across all of your devices. Some of your recent sessions are listed below; however, this list may not be exhaustive. If you feel your account has been compromised, you should also update your password.
                            </p>

                            {/* Current Session */}
                            <div className="flex items-center gap-4 mb-6">
                                <Monitor className="w-8 h-8 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">OS X - Chrome</p>
                                    <p className="text-xs text-gray-500">
                                        127.0.0.1, <span className="text-green-600 font-medium">This device</span>
                                    </p>
                                </div>
                            </div>

                            <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide">
                                Log Out Other Browser Sessions
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default Profile;
