import { uploadToSupabase } from './utils/supabaseStorage.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
    console.log('--- Starting Supabase Storage Test ---');
    
    const testFilePath = path.join(__dirname, 'test-file.txt');
    
    if (!fs.existsSync(testFilePath)) {
        console.error('Test file not found at:', testFilePath);
        process.exit(1);
    }

    try {
        console.log('Uploading test file...');
        const result = await uploadToSupabase(testFilePath, 'uploads', 'tests');
        
        console.log('SUCCESS!');
        console.log('Public URL:', result.publicUrl);
        console.log('Path in Bucket:', result.path);
        
    } catch (error) {
        console.error('UPLOAD FAILED!');
        console.error('Error details:', error);
    } finally {
        // Clean up
        if (fs.existsSync(testFilePath)) {
            // fs.unlinkSync(testFilePath); // Optional: keep it for verification if needed
        }
    }
}

testUpload();
