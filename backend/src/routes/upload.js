// src/routes/upload.js
// Cloudinary-based file upload replacing base44.integrations.Core.UploadFile
const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { requireAuth } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store in memory so we can stream to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp|tiff?)/;
    cb(null, allowed.test(file.mimetype));
  },
});

// POST /api/upload  (multipart/form-data, field name: "file")
// Returns: { file_url: "https://res.cloudinary.com/..." }
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'phoenix-farm',
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    res.json({ file_url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/upload/:publicId  – optional cleanup
router.delete('/:publicId(*)', requireAuth, async (req, res, next) => {
  try {
    await cloudinary.uploader.destroy(req.params.publicId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
