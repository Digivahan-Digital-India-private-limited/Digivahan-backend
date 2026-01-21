const cloudinary = require("cloudinary").v2;
const multer = require("multer");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer memory storage (NO cloud upload here)
const storage = multer.memoryStorage();

const bypassupload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

module.exports = { cloudinary, bypassupload };
