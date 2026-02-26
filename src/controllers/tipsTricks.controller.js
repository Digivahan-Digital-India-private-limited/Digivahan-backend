const TipsTricks = require("../models/tipsTricks.model");
const cloudinary = require("cloudinary").v2;
const { deleteFromCloudinary } = require("../middleware/cloudinary");
const mongoose = require("mongoose");

exports.createTipsTricks = async (req, res) => {
  try {
    const { title, summary, messages } = req.body;

    if (!req.files?.banner?.length) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      });
    }

    if (!req.files?.icons?.length) {
      return res.status(400).json({
        success: false,
        message: "At least one point icon is required",
      });
    }

    const parsedMessages = JSON.parse(messages || "[]");

    if (parsedMessages.length !== req.files.icons.length) {
      return res.status(400).json({
        success: false,
        message: "Points icons and messages count mismatch",
      });
    }

    // 🔥 Upload banner + icons in parallel
    const bannerFile = req.files.banner[0];

    const bannerPromise = cloudinary.uploader.upload(bannerFile.path, {
      folder: "tips_tricks/banner",
    });

    const iconPromises = req.files.icons.map((file) =>
      cloudinary.uploader.upload(file.path, {
        folder: "tips_tricks/icons",
      }),
    );

    // ⏳ Wait all uploads together
    const [bannerUpload, ...iconUploads] = await Promise.all([
      bannerPromise,
      ...iconPromises,
    ]);

    // 🧠 Map points
    const points = iconUploads.map((upload, index) => ({
      icon: upload.secure_url,
      icon_public_id: upload.public_id,
      message: parsedMessages[index],
    }));

    // 💾 Save in DB
    const saved = await TipsTricks.create({
      banner: bannerUpload.secure_url,
      banner_public_id: bannerUpload.public_id,
      title,
      summary,
      points,
    });

    return res.status(201).json({
      success: true,
      message: "Tips & Tricks added successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Create Tips Tricks Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add tips & tricks",
    });
  }
};

exports.updateTipsTricks = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, messages } = req.body;

    const doc = await TipsTricks.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Tips not found",
      });
    }

    // 🔹 Update text fields
    if (title) doc.title = title;
    if (summary) doc.summary = summary;

    /* -----------------------
       🔥 Banner Update
    ----------------------- */
    if (req.files?.banner?.length) {
      const bannerFile = req.files.banner[0];

      // delete old banner + upload new banner in parallel
      const bannerUpload = await Promise.all([
        doc.banner_public_id
          ? cloudinary.uploader.destroy(doc.banner_public_id)
          : Promise.resolve(),
        cloudinary.uploader.upload(bannerFile.path, {
          folder: "tips_tricks/banner",
        }),
      ]);

      const uploadResult = bannerUpload[1];

      doc.banner = uploadResult.secure_url;
      doc.banner_public_id = uploadResult.public_id;
    }

    /* -----------------------
       🔥 Points Update
    ----------------------- */
    if (req.files?.icons?.length && messages) {
      const parsedMessages = JSON.parse(messages);

      if (parsedMessages.length !== req.files.icons.length) {
        return res.status(400).json({
          success: false,
          message: "Icons and messages count mismatch",
        });
      }

      // 🔥 Delete old icons in parallel
      await Promise.all(
        doc.points.map((p) =>
          p.icon_public_id
            ? cloudinary.uploader.destroy(p.icon_public_id)
            : Promise.resolve(),
        ),
      );

      // 🔥 Upload new icons in parallel
      const iconUploads = await Promise.all(
        req.files.icons.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder: "tips_tricks/icons",
          }),
        ),
      );

      doc.points = iconUploads.map((upload, index) => ({
        icon: upload.secure_url,
        icon_public_id: upload.public_id,
        message: parsedMessages[index],
      }));
    }

    await doc.save();

    return res.json({
      success: true,
      message: "Tips & Tricks updated successfully",
      data: doc,
    });
  } catch (err) {
    console.error("Update Tips Error:", err);
    return res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

exports.deleteTipsTricks = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Validate ObjectId FIRST
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const doc = await TipsTricks.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Tips not found",
      });
    }

    const publicIds = [
      doc.banner_public_id,
      ...doc.points.map((p) => p.icon_public_id),
    ].filter(Boolean);

    await Promise.all(
      publicIds.map((publicId) => deleteFromCloudinary(publicId)),
    );

    await TipsTricks.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: "Tips & Tricks deleted successfully",
    });
  } catch (err) {
    console.error("Delete Tips Error:", err);
    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

exports.getAllTipsTricks = async (req, res) => {
  try {
    const list = await TipsTricks.find().sort({ createdAt: -1 }).lean(); // 🔥 skip mongoose document hydration

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error("Get Tips Error:", err);
    return res.status(500).json({
      success: false,
      message: "Fetch failed",
    });
  }
};

exports.getSingleTipsTricks = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Validate ObjectId first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const doc = await TipsTricks.findById(id).lean(); // 🔥 lean = faster

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Tips not found",
      });
    }

    return res.json({
      success: true,
      data: doc,
    });
  } catch (err) {
    console.error("Get Single Tips Error:", err);
    return res.status(500).json({
      success: false,
      message: "Fetch failed",
    });
  }
};
