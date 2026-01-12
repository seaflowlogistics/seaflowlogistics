import React from 'react';
import Layout from '../components/Layout';
import { Container } from 'lucide-react';

const Containers: React.FC = () => {
    return (
        <Layout>
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] animate-fade-in">
                <div className="bg-gray-50 p-6 rounded-full mb-4">
                    <Container className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Containers</h2>
                <p className="text-gray-500">No details provided</p>
            </div>
        </Layout>
    );
};

export default Containers;
