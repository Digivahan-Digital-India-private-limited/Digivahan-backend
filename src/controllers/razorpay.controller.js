const axios = require("axios");
const AppInfo = require("../models/appInfo.model");

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, user_id, purpose } = req.body;

    if (!amount || !user_id || !purpose) {
      return res.status(400).json({
        success: false,
        message: "amount, user_id and purpose are required",
      });
    }

    // 🔑 Fetch Razorpay Key ID from DB
    const appInfo = await AppInfo.findOne({}, { "api_key.razorpay_key_id": 1 }).lean();

    if (!appInfo || !appInfo.api_key?.razorpay_key_id) {
      return res.status(500).json({
        success: false,
        message: "Razorpay key not configured",
      });
    }

    const razorpay_key_id = appInfo.api_key.razorpay_key_id;
    const razorpay_key_secret = process.env.RAZORPAY_KEY_SECRET;

    // 🧾 Auto-generate receipt
    const receipt = `receipt_${Date.now()}`;

    // 📦 Razorpay Order Body
    const orderPayload = {
      amount: amount, // Razorpay expects amount in paise
      currency: "INR",
      receipt,
      notes: {
        user_id,
        purpose,
      },
    };

    // 🚀 Call Razorpay API
    const response = await axios.post(
      "https://api.razorpay.com/v1/orders",
      orderPayload,
      {
        auth: {
          username: razorpay_key_id,
          password: razorpay_key_secret,
        },
      }
    );

    // ✅ Final Response
    return res.json({
      success: true,
      razorpay_key_id,
      receipt,
      order: response.data,
    });

  } catch (error) {
    console.error("Razorpay Order Error:", error?.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};
