const { cloudinary } = require("../middleware/bypassCloudinary");
const streamifier = require("streamifier");

exports.uploadNotificationImage = async (req, res) => {
  try {
    const { folder_name } = req.body;

    if (!folder_name) {
      return res.status(400).json({
        success: false,
        message: "folder_name is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // ✅ Upload buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `notification_file/${folder_name}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    return res.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        image_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        folder: `notification_file/${folder_name}`,
      },
    });
  } catch (error) {
    console.error("Upload Notification Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
};


exports.deleteNotificationImage = async (req, res) => {
    try {
      const { public_id } = req.body;
  
      if (!public_id) {
        return res.status(400).json({
          success: false,
          message: "public_id is required",
        });
      }
  
      await cloudinary.uploader.destroy(public_id);
  
      return res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error) {
      console.error("Delete Notification Image Error:", error);
      return res.status(500).json({
        success: false,
        message: "Image delete failed",
      });
    }
  };
  