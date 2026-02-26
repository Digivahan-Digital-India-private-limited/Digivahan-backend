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

    // ✅ Validation
    if (
      !user_id ||
      !order_id ||
      !product_type ||
      !rating ||
      !review_title ||
      !review_text
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // ✅ Fetch only required user fields (lean = faster)
    const user = await User.findById(user_id)
      .select("basic_details.first_name basic_details.profile_pic")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const username = user.basic_details?.first_name || "User";
    const profile_image = user.basic_details?.profile_pic || "";

    // ✅ Atomic UPSERT (Create or Update in ONE query)
    const review = await Feedback.findOneAndUpdate(
      {
        user_id,
        order_id,
      },
      {
        $set: {
          product_type,
          rating,
          review_title,
          review_text,
          username,
          profile_image,
        },
        $addToSet: {
          product_image: {
            $each: Array.isArray(product_image) ? product_image : [],
          },
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Review saved successfully",
      data: review,
    });
  } catch (error) {
    console.error("addUserReview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const FetchUserFeedBack = async (req, res) => {
  try {
    let { product_type, limit = 10, page = 1 } = req.body;

    limit = Math.min(parseInt(limit) || 10, 50); // max limit protection
    page = parseInt(page) || 1;

    const skip = (page - 1) * limit;

    // ✅ Optimized query object
    const query = product_type ? { product_type } : {};

    // ✅ Run queries in parallel (faster)
    const [feedbackList, totalRecords] = await Promise.all([
      Feedback.find(query)
        .select(
          "user_id username profile_image order_id product_type rating product_image review_title review_text createdAt",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // 🔥 VERY IMPORTANT (3x faster)

      Feedback.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Feedback fetched successfully",
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_records: totalRecords,
        limit,
        has_next_page: page < totalPages,
      },
      data: feedbackList,
    });
  } catch (error) {
    console.error("FetchUserFeedBack Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = { addUserReview, FetchUserFeedBack };
