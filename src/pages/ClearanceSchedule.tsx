import React from 'react';
import Layout from '../components/Layout';
import { Construction } from 'lucide-react';

const ClearanceSchedule: React.FC = () => {
    return (
        <Layout>
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
                <div className="bg-yellow-100 p-6 rounded-full mb-4">
                    <Construction className="w-12 h-12 text-yellow-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Clearance Schedule</h1>
                <p className="text-gray-600 max-w-md">
                    This module is currently under development. It will feature the schedule view, search by job/consignee, and transport mode filters.
                </p>
            </div>
        </Layout>
    );
};

export default ClearanceSchedule;
