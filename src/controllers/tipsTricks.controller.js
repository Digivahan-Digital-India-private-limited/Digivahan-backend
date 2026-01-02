const TipsTricks = require("../models/tipsTricks.model");
const cloudinary = require("cloudinary").v2;
const { deleteCloudinaryImage } = require("../middleware/cloudinary");

exports.createTipsTricks = async (req, res) => {
  try {
    const { title, summary, messages } = req.body;

    // banner image
    if (!req.files || !req.files.banner) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      });
    }

    // points icons
    if (!req.files.icons || req.files.icons.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one point icon is required",
      });
    }

    // messages array check
    const parsedMessages = JSON.parse(messages || "[]");
    if (parsedMessages.length !== req.files.icons.length) {
      return res.status(400).json({
        success: false,
        message: "Points icons and messages count mismatch",
      });
    }

    // banner upload
    const bannerFile = req.files.banner[0];
    const bannerUpload = await cloudinary.uploader.upload(bannerFile.path, {
      folder: "tips_tricks/banner",
    });

    // points upload
    const points = [];
    for (let i = 0; i < req.files.icons.length; i++) {
      const iconFile = req.files.icons[i];

      const iconUpload = await cloudinary.uploader.upload(iconFile.path, {
        folder: "tips_tricks/icons",
      });

      points.push({
        icon: iconUpload.secure_url,
        icon_public_id: iconUpload.public_id,
        message: parsedMessages[i],
      });
    }

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
      return res.status(404).json({ success: false, message: "Tips not found" });
    }

    // text updates (optional)
    if (title) doc.title = title;
    if (summary) doc.summary = summary;

    // banner update (optional)
    if (req.files?.banner) {
      await deleteCloudinaryImage(doc.banner_public_id);

      const bannerUpload = await cloudinary.uploader.upload(
        req.files.banner[0].path,
        { folder: "tips_tricks/banner" }
      );

      doc.banner = bannerUpload.secure_url;
      doc.banner_public_id = bannerUpload.public_id;
    }

    // points update (optional)
    if (req.files?.icons && messages) {
      // delete old icons
      for (const p of doc.points) {
        await deleteCloudinaryImage(p.icon_public_id);
      }

      const parsedMessages = JSON.parse(messages);
      const newPoints = [];

      for (let i = 0; i < req.files.icons.length; i++) {
        const iconUpload = await cloudinary.uploader.upload(
          req.files.icons[i].path,
          { folder: "tips_tricks/icons" }
        );

        newPoints.push({
          icon: iconUpload.secure_url,
          icon_public_id: iconUpload.public_id,
          message: parsedMessages[i],
        });
      }

      doc.points = newPoints;
    }

    await doc.save();

    return res.json({
      success: true,
      message: "Tips & Tricks updated successfully",
      data: doc,
    });
  } catch (err) {
    console.error("Update Tips Error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

exports.deleteTipsTricks = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await TipsTricks.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tips not found" });
    }

    // delete banner
    await deleteCloudinaryImage(doc.banner_public_id);

    // delete icons
    for (const p of doc.points) {
      await deleteCloudinaryImage(p.icon_public_id);
    }

    await TipsTricks.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Tips & Tricks deleted successfully",
    });
  } catch (err) {
    console.error("Delete Tips Error:", err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

exports.getAllTipsTricks = async (req, res) => {
  try {
    const list = await TipsTricks.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error("Get Tips Error:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

exports.getSingleTipsTricks = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await TipsTricks.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tips not found" });
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (err) {
    console.error("Get Single Tips Error:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

