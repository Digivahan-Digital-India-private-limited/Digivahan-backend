const News = require("../models/news.model");
const { deleteCloudinaryImage } = require("../middleware/cloudinary");

/**
 * ✅ CREATE NEWS
 */
exports.createNews = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Banner image required" });
    }

    const { news_type, heading, sub_heading, news } = req.body;

    const createdNews = await News.create({
      banner: req.file.path,
      banner_public_id: req.file.filename,
      news_type,
      heading,
      sub_heading,
      news,
    });

    res.status(201).json({
      success: true,
      message: "News created successfully",
      data: createdNews,
    });
  } catch (err) {
    console.error("Create News Error:", err);
    res.status(500).json({ success: false, message: "Failed to create news" });
  }
};

/**
 * ✏️ UPDATE NEWS (ALL FIELDS OPTIONAL)
 */
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNews = await News.findById(id);
    if (!existingNews) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    // agar new banner aaya to purana delete karo
    if (req.file) {
      await deleteCloudinaryImage(existingNews.banner_public_id);
      existingNews.banner = req.file.path;
      existingNews.banner_public_id = req.file.filename;
    }

    // baaki fields optional
    const fields = ["news_type", "heading", "sub_heading", "news"];
    fields.forEach((field) => {
      if (req.body[field]) {
        existingNews[field] = req.body[field];
      }
    });

    await existingNews.save();

    res.json({
      success: true,
      message: "News updated successfully",
      data: existingNews,
    });
  } catch (err) {
    console.error("Update News Error:", err);
    res.status(500).json({ success: false, message: "Failed to update news" });
  }
};

/**
 * 🗑️ DELETE NEWS (Cloudinary + Mongo)
 */
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    await deleteCloudinaryImage(news.banner_public_id);
    await News.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (err) {
    console.error("Delete News Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete news" });
  }
};

/**
 * 📃 FETCH ALL NEWS
 */
exports.getAllNews = async (req, res) => {
    try {
      // Query params
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const { news_type } = req.query;
  
      // Filter object
      const filter = {};
      if (news_type) {
        filter.news_type = news_type;
      }
  
      const totalCount = await News.countDocuments(filter);
  
      const list = await News.find(filter)
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(limit);
  
      res.json({
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
      res.status(500).json({
        success: false,
        message: "Failed to fetch news list",
      });
    }
  };
  
