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
    let { product_type, review_type, limit = 10, page = 1 } = req.body;

    limit = Math.min(parseInt(limit) || 10, 50);
    page = parseInt(page) || 1;

    const skip = (page - 1) * limit;

    const query = {};

    if (product_type) {
      query.product_type = product_type;
    }

    // ⭐ Review Type Filter
    if (review_type === "positive") {
      query.rating = { $gte: 4 };
    } 
    else if (review_type === "average") {
      query.rating = 3;
    } 
    else if (review_type === "negative") {
      query.rating = { $lte: 2 };
    }

    const [feedbackList, totalRecords] = await Promise.all([
      Feedback.find(query)
        .select(
          "user_id username profile_image order_id product_type rating product_image review_title review_text createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

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

const getReviewAnalytics = async (req, res) => {
  try {

    const [
      positiveCount,
      averageCount,
      negativeCount,
      recentPositive,
      recentNegativeAverage
    ] = await Promise.all([

      Feedback.countDocuments({ rating: { $gte: 4 } }),

      Feedback.countDocuments({ rating: 3 }),

      Feedback.countDocuments({ rating: { $lte: 2 } }),

      Feedback.find({ rating: { $gte: 4 } })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),

      Feedback.find({ rating: { $lte: 3 } })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean()
    ]);

    const happyCustomers = positiveCount + averageCount;
    const sadCustomers = negativeCount;
    const totalCustomers = happyCustomers + sadCustomers;

    const happyCustomerPercent =
      totalCustomers === 0
        ? 0
        : ((happyCustomers / totalCustomers) * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        total_customers: totalCustomers,
        happy_customers: happyCustomers,
        sad_customers: sadCustomers,
        happy_customer_percent: Number(happyCustomerPercent),

        positive_reviews: positiveCount,
        average_reviews: averageCount,
        negative_reviews: negativeCount,

        recent_positive_reviews: recentPositive,
        recent_negative_average_reviews: recentNegativeAverage
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success:false,
      message:"Internal Server Error"
    });
  }
};

const replyToReview = async (req, res) => {
  try {

    const { review_id, reply_message } = req.body;

    if (!review_id || !reply_message) {
      return res.status(400).json({
        success: false,
        message: "Review id and reply message required"
      });
    }

    const review = await Feedback.findByIdAndUpdate(
      review_id,
      {
        admin_reply: {
          message: reply_message,
          replied_at: new Date()
        }
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: review
    });

  } catch (error) {

    console.error("replyToReview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};

module.exports = { addUserReview, FetchUserFeedBack, getReviewAnalytics, replyToReview };
