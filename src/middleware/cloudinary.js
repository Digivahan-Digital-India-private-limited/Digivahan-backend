const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer + Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads", // Cloudinary folder name
    resource_type: "image", // use "image" for profile pics
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Upload middleware (single image)
const upload = multer({ storage });

// Cloudinary Storage (PDF Only)
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "vehicle_docs/pdf",
    resource_type: "image", // 🔥 change
  }),
});

// // Correct Multer PDF upload middleware
const uploadpdf = multer({
  storage: pdfStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // ✅ 2MB
  },
});

// Memory storage – keeps file in buffer
const multerstorage = multer.memoryStorage();
const profilePicParser = multer({
  multerstorage,
}).single("profile_pic");

// Delete image from cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    // 1️⃣ Try deleting as IMAGE
    let result = await cloudinary.uploader.destroy(publicId);

    // 2️⃣ If not found as image, try RAW (pdf, doc, etc.)
    if (result.result === "not found") {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
      });
    }

    console.log("Cloudinary delete result:", result);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

// upload Qr on cloudinary
const uploadQrToCloudinary = (buffer, qr_id) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "qruloadfile",
          public_id: qr_id,
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(buffer);
  });
};

module.exports = {
  upload,
  uploadpdf,
  deleteFromCloudinary,
  profilePicParser,
  uploadQrToCloudinary,
};
