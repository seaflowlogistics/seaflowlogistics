import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, /tmp is the only writable directory
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '../uploads');

// Ensure directory exists (only if not on Vercel or if we're in /tmp)
if (!isVercel && !fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
        console.warn('Could not create upload directory:', e.message);
    }
} else if (isVercel && !fs.existsSync(uploadDir)) {
    // On Vercel we can create in /tmp
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
        // Ignore if fails
    }
}

// Memory storage is safer for Vercel Vercel to avoid EROFS issues entirely
// but since many routes use req.file.path, we'll use diskStorage pointing to /tmp on Vercel
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const upload = multer({ storage });
export default upload;
