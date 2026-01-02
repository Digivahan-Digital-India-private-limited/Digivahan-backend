const multer = require('multer');
const { uploadToS3 } = require('../utils/upload.helper');

// memory storage (no local file)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image required' });
    }

    const file = req.file;
    const key = `uploads/${Date.now()}-${file.originalname}`;

    const url = await uploadToS3({
      buffer: file.buffer,
      mimetype: file.mimetype,
      key,
    });

    return res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        key,
        url,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

module.exports = { upload, uploadImage };
