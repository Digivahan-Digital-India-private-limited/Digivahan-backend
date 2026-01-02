const Feedback = require("../models/reviewSchema");
const User = require("../models/User"); // to verify user exists

const addUserReview = async (req, res) => {
  try {
    const {
      user_id,
      order_id,
      product_type,
      rating,
      product_image = [],
      review_title,
      review_text,
    } = req.body;

    // ===== 1️⃣ Find User & Get first_name + profile_pic =====
    const user = await User.findById(user_id).select("basic_details");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const username = user.basic_details?.first_name || "User";
    const profile_image = user.basic_details?.profile_pic || "";

    // ===== 2️⃣ Check Existing Review =====
    const existingReview = await Feedback.findOne({
      user_id,
      order_id,
    });

    // ===== 3️⃣ Update Review If Exists =====
    if (existingReview) {
      existingReview.product_type = product_type;
      existingReview.rating = rating;
      existingReview.review_title = review_title;
      existingReview.review_text = review_text;

      // 🔥 product_image is array of string
      if (Array.isArray(product_image) && product_image.length > 0) {
        existingReview.product_image.push(...product_image);
      }

      await existingReview.save();

      return res.status(200).json({
        success: true,
        message: "Review updated successfully",
        data: existingReview,
      });
    }

    // ===== 4️⃣ Create New Review =====
    const newReview = await Feedback.create({
      user_id,
      username,
      profile_image,
      order_id,
      product_type,
      rating,
      product_image: Array.isArray(product_image) ? product_image : [],
      review_title,
      review_text,
    });

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: newReview,
    });
  } catch (error) {
    console.error("addUserReview Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const FetchUserFeedBack = async (req, res) => {
  try {
    let { product_type, limit, page } = req.body;

    // Default pagination values
    limit = parseInt(limit) || 10; // items per page
    page = parseInt(page) || 1; // current page
    const skip = (page - 1) * limit;

    // ===== Build Query =====
    let query = {};

    if (product_type) {
      query.product_type = product_type;
    }

    // ===== Fetch Data with Pagination =====
    const feedbackList = await Feedback.find(query)
      .populate("user_id", "name email") // optional: show user info
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    // ===== Count Total for Pagination =====
    const totalRecords = await Feedback.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Feedback fetched successfully",
      current_page: page,
      total_pages: totalPages,
      total_records: totalRecords,
      limit: limit,
      data: feedbackList,
    });
  } catch (error) {
    console.error("FetchUserFeedBack Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { addUserReview, FetchUserFeedBack };
