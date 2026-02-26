const Admin = require("../models/admin.model");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/revokedTokenSchema");
const redis = require("../utils/redis");
const { generateOTP, sendOTP } = require("../utils/otpUtils");
const { generateAuthToken } = require("../middleware/auth");

const SignInAdmin = async (req, res) => {
  try {
    const { phone } = req.body;

    /* ===============================
       1️⃣ Validate phone
    =============================== */

    if (!phone) {
      return res.status(400).json({
        status: false,
        message: "Valid phone number is required",
      });
    }

    /* ===============================
       2️⃣ Check admin exists (INDEX USED)
    =============================== */

    const admin = await Admin.findOne(
      { phone, is_active: true },
      { _id: 1, phone: 1 },
    ).lean();

    if (!admin) {
      return res.status(404).json({
        status: false,
        message: "Admin not registered",
      });
    }

    /* ===============================
       3️⃣ Generate OTP
    =============================== */

    const otpCode = generateOTP(6);

    const redisKey = `admin:otp:${phone}`;

    /* ===============================
       4️⃣ Save OTP in Redis (10 min)
    =============================== */

    await redis.set(redisKey, otpCode, "EX", 600);

    /* ===============================
       5️⃣ Send OTP
    =============================== */

    const otpSent = await sendOTP(phone, otpCode, "PHONE", "login");

    if (!otpSent) {
      await redis.del(redisKey);

      return res.status(500).json({
        status: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    /* ===============================
       6️⃣ Success response
    =============================== */

    return res.status(200).json({
      status: true,
      message: `OTP sent successfully to ${phone}`,
      valid_until: new Date(Date.now() + 600000).toISOString(),
      otp_verify_endpoint: "/admin/verify-admin",
    });
  } catch (error) {
    console.error("Admin SignIn OTP Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const verifyAdminOTP = async (req, res) => {
  try {
    const { phone, OtpCode } = req.body;

    /* ===============================
       1️⃣ Validate input
    =============================== */

    if (!phone || !OtpCode) {
      return res.status(400).json({
        status: false,
        message: "phone and OtpCode are required",
      });
    }

    /* ===============================
       2️⃣ Check Admin exists
    =============================== */

    const admin = await Admin.findOne(
      { phone },
      { _id: 1, email: 1, phone: 1, first_name: 1, last_name: 1 },
    ).lean();

    if (!admin) {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
      });
    }

    /* ===============================
       3️⃣ Get OTP from Redis
    =============================== */

    const redisKey = `admin:otp:${phone}`;

    const storedOTP = await redis.get(redisKey);

    if (!storedOTP) {
      return res.status(400).json({
        status: false,
        message: "OTP expired or not found",
      });
    }

    /* ===============================
       4️⃣ Verify OTP
    =============================== */

    if (storedOTP !== OtpCode) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    /* ===============================
       5️⃣ Delete OTP after success
    =============================== */

    await redis.del(redisKey);

    /* ===============================
       6️⃣ Generate Auth Token
    =============================== */

    const token = generateAuthToken({
      user_id: admin._id,
      email: admin.email,
      phone_number: admin.phone,
    });

    /* ===============================
       7️⃣ Update last login time
    =============================== */

    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          last_login: new Date(),
        },
      },
    );

    /* ===============================
       8️⃣ Success Response
    =============================== */

    return res.status(200).json({
      status: true,
      message: "Admin login successful",
      token,
      admin: {
        user_id: admin._id,
        phone: admin.phone,
        email: admin.email,
        name: `${admin.first_name} ${admin.last_name}`,
      },
    });
  } catch (error) {
    console.error("Verify Admin OTP Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const LogoutAdmin = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access token required",
      });
    }

    // 1️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2️⃣ Convert exp (seconds) → Date
    const expiryDate = new Date(decoded.exp * 1000);

    // 3️⃣ Save revoked token
    await RevokedToken.create({
      token: token,
      date: expiryDate,
    });

    return res.status(200).json({
      status: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

module.exports = { SignInAdmin, verifyAdminOTP, LogoutAdmin };
