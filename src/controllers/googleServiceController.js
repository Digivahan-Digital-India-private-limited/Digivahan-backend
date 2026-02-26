const GoogleService = require("../models/googleServicemodel");
const { cloudinary } = require("../middleware/bypassCloudinary");
const streamifier = require("streamifier");

const AddGoogleService = async (req, res) => {
  try {
    const { title, service_type, status } = req.body;

    // 1️⃣ Validation
    if (!title || !service_type || !status) {
      return res.status(400).json({
        status: false,
        message: "title, service_type and status are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Icon file is required",
      });
    }

    // 2️⃣ Upload buffer to Cloudinary (🔥 EXACT pattern you asked for)
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "google_services",
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // 3️⃣ Save in DB
    const newService = await GoogleService.create({
      title,
      service_type,
      status,
      icon: uploadResult.secure_url, // ✅ Cloudinary URL
      icon_public_id: uploadResult.public_id, // 🔥 IMPORTANT
    });

    return res.status(201).json({
      status: true,
      message: "Google service added successfully",
      data: newService,
    });
  } catch (error) {
    console.error("AddGoogleService Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to add Google service",
      error: error.message,
    });
  }
};

const getAllservice = async (req, res) => {
  try {
    // 1️⃣ Fetch all services from DB
    const services = await GoogleService.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "All services fetched successfully",
      data: services,
    });
  } catch (error) {
    console.error("getAllservice Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

const Updateservice = async (req, res) => {
  try {
    const { service_id, title, service_type, status } = req.body;

    if (!service_id) {
      return res.status(400).json({
        status: false,
        message: "service_id is required",
      });
    }

    // 1️⃣ Find service
    const service = await GoogleService.findById(service_id);

    if (!service) {
      return res.status(404).json({
        status: false,
        message: "Service not found",
      });
    }

    // 2️⃣ ICON UPDATE LOGIC (SAFE VERSION)
    if (req.file) {
      const buffer = req.file.buffer;

      // 🔹 Upload NEW image first
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "google_services",
              resource_type: "image",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            },
          )
          .end(buffer);
      });

      // 🔹 Delete OLD image only after successful upload
      if (service.icon_public_id) {
        await cloudinary.uploader.destroy(service.icon_public_id);
      }

      // 🔹 Save new image data
      service.icon = uploadResult.secure_url;
      service.icon_public_id = uploadResult.public_id;
    }

    // 3️⃣ Update other fields (if provided)
    if (title !== undefined) service.title = title;
    if (service_type !== undefined) service.service_type = service_type;
    if (status !== undefined) service.status = status;

    // 4️⃣ Save updated service
    await service.save();

    return res.status(200).json({
      status: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Updateservice Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

module.exports = { AddGoogleService, getAllservice, Updateservice };
