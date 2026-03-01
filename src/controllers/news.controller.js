const News = require("../models/news.model");
const { deleteFromCloudinary } = require("../middleware/cloudinary");
const mongoose = require("mongoose");

/**
 * ✅ CREATE NEWS
 */
exports.createNews = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Banner image required",
      });
    }

    const { news_type, heading, sub_heading } = req.body;

    let news = req.body.news;

    if (!news_type || !heading || !news) {
      return res.status(400).json({
        success: false,
        message: "news_type, heading and news are required",
      });
    }

    // Replace literal \n with real newline
    if (news) {
      news = news.replace(/\\n/g, "\n");
    }

    const createdNews = await News.create({
      banner: req.file.path, // secure_url
      banner_public_id: req.file.filename, // public_id
      news_type,
      heading,
      sub_heading: sub_heading || "",
      news,
    });

    return res.status(201).json({
      success: true,
      message: "News created successfully",
      data: createdNews,
    });
  } catch (err) {
    console.error("Create News Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create news",
    });
  }
};

/**
 * ✏️ UPDATE NEWS (ALL FIELDS OPTIONAL)
 */
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const existingNews = await News.findById(id);

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    // 🔥 Banner update (only one image)
    if (req.file) {
      if (existingNews.banner_public_id) {
        await deleteFromCloudinary(existingNews.banner_public_id);
      }

      existingNews.banner = req.file.path;
      existingNews.banner_public_id = req.file.filename;
    }

    // 🔥 Optional fields update
    ["news_type", "heading", "sub_heading", "news"].forEach((field) => {
      if (req.body[field] !== undefined) {
        existingNews[field] = req.body[field];
      }
    });

    await existingNews.save();

    return res.json({
      success: true,
      message: "News updated successfully",
      data: existingNews,
    });
  } catch (err) {
    console.error("Update News Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update news",
    });
  }
};

/**
 * 🗑️ DELETE NEWS (Cloudinary + Mongo)
 */
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    // 🔥 Find document (lean for speed)
    const news = await News.findById(id).lean();

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    // 🔥 Delete image first (single image only)
    if (news.banner_public_id) {
      await deleteFromCloudinary(news.banner_public_id);
    }

    // 🔥 Delete document (single DB hit)
    await News.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (err) {
    console.error("Delete News Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete news",
    });
  }
};

/**
 * 📃 FETCH ALL NEWS
 */
exports.getAllNews = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // 🔥 max limit control
    const skip = (page - 1) * limit;

    const { news_type } = req.query;

    const filter = {};
    if (news_type) {
      filter.news_type = news_type;
    }

    // 🔥 Run both queries in parallel
    const [totalCount, list] = await Promise.all([
      News.countDocuments(filter),
      News.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), // 🔥 important for speed
    ]);

    return res.json({
      success: true,
      pagination: {
        total_items: totalCount,
        current_page: page,
        total_pages: Math.ceil(totalCount / limit),
        limit,
      },
      data: list,
    });
  } catch (err) {
    console.error("Fetch News Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch news list",
    });
  }
};
