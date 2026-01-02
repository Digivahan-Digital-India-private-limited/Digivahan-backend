const cloudinary = require("cloudinary").v2;
const QrBenefits = require("../models/qrBenefits.model");
const { deleteCloudinaryImage } = require("../middleware/cloudinary");


exports.uploadQrBenefitThumbnail = async (req, res) => {
  try {
    const { video_title, video_url } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Thumbnail image is required",
      });
    }

    if (!video_title || !video_url) {
      return res.status(400).json({
        success: false,
        message: "video_title and video_url are required",
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "qr_benefits",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // ✅ Save ALL required fields
    const saved = await QrBenefits.create({
      video_thumbnail: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      video_title,
      video_url,
    });

    return res.json({
      success: true,
      data: saved,
    });
  } catch (error) {
    console.error("QR Benefits upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

exports.deleteQrBenefit = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "QR Benefit id is required",
        });
      }
  
      // 1️⃣ Find document
      const qrBenefit = await QrBenefits.findById(id);
  
      if (!qrBenefit) {
        return res.status(404).json({
          success: false,
          message: "QR Benefit not found",
        });
      }
  
      // 2️⃣ Delete image from Cloudinary
      if (qrBenefit.public_id) {
        await deleteCloudinaryImage(qrBenefit.public_id);
      }
  
      // 3️⃣ Delete document from MongoDB
      await QrBenefits.findByIdAndDelete(id);
  
      // 4️⃣ Final response
      return res.json({
        success: true,
        message: "Video is deleted",
      });
    } catch (error) {
      console.error("Delete QR Benefit error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete video",
      });
    }
  };

exports.updateQrBenefit = async (req, res) => {
    try {
      const { id } = req.params;
      const { video_title, video_url } = req.body;
  
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "QR Benefit id is required",
        });
      }
  
      // 1️⃣ Find existing document
      const qrBenefit = await QrBenefits.findById(id);
  
      if (!qrBenefit) {
        return res.status(404).json({
          success: false,
          message: "QR Benefit not found",
        });
      }
  
      const updateData = {};
  
      // 2️⃣ Optional text updates
      if (video_title) updateData.video_title = video_title;
      if (video_url) updateData.video_url = video_url;
  
      // 3️⃣ Optional image update
      if (req.file) {
        // delete old image
        if (qrBenefit.public_id) {
          await deleteCloudinaryImage(qrBenefit.public_id);
        }
  
        // upload new image
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "qr_benefits",
                resource_type: "image",
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            )
            .end(req.file.buffer);
        });
  
        updateData.video_thumbnail = uploadResult.secure_url;
        updateData.public_id = uploadResult.public_id;
      }
  
      // 4️⃣ Update DB
      const updated = await QrBenefits.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );
  
      return res.json({
        success: true,
        message: "QR Benefit updated successfully",
        data: updated,
      });
  
    } catch (error) {
      console.error("Update QR Benefit error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update QR Benefit",
      });
    }
  };

// GET all QR Benefits videos
exports.getAllQrBenefits = async (req, res) => {
    try {
      const list = await QrBenefits.find().sort({ createdAt: -1 });
  
      return res.json({
        success: true,
        count: list.length,
        data: list
      });
    } catch (error) {
      console.error("Get QR Benefits Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch QR benefits list"
      });
    }
  };
  