import { supabase } from '../config/supabase.js';
import fs from 'fs';
import path from 'path';

/**
 * Uploads a file to Supabase Storage
 * @param {string} localFilePath - Path to the file on local disk
 * @param {string} bucketName - Supabase bucket name
 * @param {string} destinationPath - Path within the bucket
 * @returns {Promise<Object>} - The Supabase upload result
 */
export const uploadToSupabase = async (localFilePath, bucketName = 'uploads', destinationPath = '') => {
    try {
        const fileContent = fs.readFileSync(localFilePath);
        const fileName = path.basename(localFilePath);
        const finalPath = destinationPath ? `${destinationPath}/${fileName}` : fileName;

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(finalPath, fileContent, {
                cacheControl: '3600',
                upsert: true,
                contentType: getContentType(fileName)
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(finalPath);

        return {
            ...data,
            publicUrl: urlData.publicUrl,
            path: finalPath
        };
    } catch (err) {
        console.error('Supabase Upload Error:', err.message);
        throw err;
    }
};

const getContentType = (fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
        case '.pdf': return 'application/pdf';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.csv': return 'text/csv';
        case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case '.xls': return 'application/vnd.ms-excel';
        default: return 'application/octet-stream';
    }
};

export default uploadToSupabase;
