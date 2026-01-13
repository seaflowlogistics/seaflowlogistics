
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5001';

async function testUpload() {
    console.log('--- Testing Upload Flow (Fixed Paths) ---');

    // 1. Login
    let token;
    let userId;
    try {
        console.log('Logging in...');
        try {
            const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
                username: 'admin',
                password: 'password123'
            });
            token = loginRes.data.token;
            userId = loginRes.data.user.id;
            console.log('✅ Login successful (password123). User ID:', userId);
        } catch (e) {
            console.log('Login failed with password123, retrying with admin123...');
            const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
                username: 'admin',
                password: 'admin123'
            });
            token = loginRes.data.token;
            userId = loginRes.data.user.id;
            console.log('✅ Login successful (admin123).');
        }
    } catch (e) {
        console.error('❌ Login failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 2. Upload
    try {
        console.log('Uploading file...');
        // Create dummy image
        const imagePath = path.join(__dirname, 'test-image.png');
        fs.writeFileSync(imagePath, 'dummy image content');

        const form = new FormData();
        form.append('photo', fs.createReadStream(imagePath));

        const uploadRes = await axios.post(`${API_URL}/api/users/${userId}/photo`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Upload response:', uploadRes.data);
        const photoUrl = uploadRes.data.photoUrl;

        // 3. Verify File on Disk
        // Parse "uploads/filename" -> server/uploads/filename
        const filename = path.basename(photoUrl);
        const serverUploadsDir = path.join(__dirname, 'uploads');
        // Ensure dir exists in check (it might have been created by upload)
        if (!fs.existsSync(serverUploadsDir)) {
            console.error('❌ Uploads dir does not exist at:', serverUploadsDir);
        } else {
            const expectedFile = path.join(serverUploadsDir, filename);
            console.log('Checking for file at:', expectedFile);

            if (fs.existsSync(expectedFile)) {
                console.log('✅ File exists on disk!');
            } else {
                console.error('❌ File MISSING from disk!');
                const dirContents = fs.readdirSync(serverUploadsDir);
                console.log('Contents of uploads dir:', dirContents);
            }
        }

        // Cleanup
        // fs.unlinkSync(imagePath);

    } catch (e) {
        console.error('❌ Upload failed:', e.response?.data || e.message);
    }
}

testUpload();
