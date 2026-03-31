const axios = require("axios");
const AppInfo = require("../models/appInfo.model");

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, user_id, purpose, status } = req.body;

    if (!amount || !user_id || !purpose) {
      return res.status(400).json({
        success: false,
        message: "amount, user_id and purpose are required",
      });
    }

    // Validate status field
    if (!status || !["test", "live"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status is required and must be either 'test' or 'live'",
      });
    }

    // 🔑 Fetch both Razorpay Key IDs from DB based on status
    const appInfo = await AppInfo.findOne(
      {},
      {
        "api_key.razorpay_key_id": 1,
        "api_key.razorpay_live_key_id": 1,
        "api_key.is_payment": 1,
      }
    ).lean();

    if (!appInfo || !appInfo.api_key) {
      return res.status(500).json({
        success: false,
        message: "Razorpay key not configured",
      });
    }

    if (!appInfo.api_key.is_payment) {
      return res.status(503).json({
        status: false,
        error_type: "payment_failed",
        message: "Payment service is temporarily disabled",
      });
    }

    // 🔀 Select credentials based on status
    let razorpay_key_id, razorpay_key_secret;

    if (status === "live") {
      razorpay_key_id = appInfo.api_key.razorpay_live_key_id;
      razorpay_key_secret = process.env.RAZORPAY_LIVE_KEY_SECRET;

      if (!razorpay_key_id) {
        return res.status(500).json({
          success: false,
          message: "Razorpay live key not configured",
        });
      }

      if (!razorpay_key_secret) {
        return res.status(500).json({
          success: false,
          message: "Razorpay live secret not configured in environment",
        });
      }
    } else {
      // status === "test"
      razorpay_key_id = appInfo.api_key.razorpay_key_id;
      razorpay_key_secret = process.env.RAZORPAY_TEST_KEY_SECRET;

      if (!razorpay_key_id) {
        return res.status(500).json({
          success: false,
          message: "Razorpay test key not configured",
        });
      }

      if (!razorpay_key_secret) {
        return res.status(500).json({
          success: false,
          message: "Razorpay test secret not configured in environment",
        });
      }
    }

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
      mode: status,
      razorpay_key_id,
      receipt,
      order: response.data,
    });
  } catch (error) {
    console.error(
      "Razorpay Order Error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};