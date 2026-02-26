const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/admin.model");
const { ERROR_MESSAGES } = require("../../constants");
const RevokedToken = require("../models/revokedTokenSchema");

/**
 * Authentication middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access token required",
      });
    }

    // 🔥 1️⃣ Check if token is revoked (LOGOUT CHECK)
    const revoked = await RevokedToken.findOne({ token });
    if (revoked) {
      return res.status(401).json({
        status: false,
        message: "Your token is invalid, please login again",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Invalid token - user not found",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Direct suspension check (faster, no schema method required)
    if (user.suspended_until && new Date() < user.suspended_until) {
      return res.status(403).json({
        status: false,
        message: ERROR_MESSAGES.USER_SUSPENDED,
        data: {
          suspended_until: user.suspended_until,
          reason: user.suspension_reason,
        },
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: false,
        message: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Token expired",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

const generateAuthToken = (payloadData) => {
  try {
    if (!payloadData || !payloadData.user_id) {
      throw new Error("user_id is required to generate token");
    }

    const payload = {
      userId: payloadData.user_id,
      email: payloadData.email || null,
      phone_number: payloadData.phone_number || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d", // token validity
      issuer: "digivahan",
    });

    return token;
  } catch (error) {
    console.error("Token generation error:", error.message);
    throw error;
  }
};

const authenticateTokenForAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access token required",
      });
    }

    // 🔥 1️⃣ Check if token is revoked (LOGOUT CHECK)
    const revoked = await RevokedToken.findOne({ token });
    if (revoked) {
      return res.status(401).json({
        status: false,
        message: "Your token is invalid, please login again",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    const admin = await Admin.findById(decoded.userId);

    if (!admin) {
      return res.status(401).json({
        status: false,
        message: "Invalid token - user not found",
      });
    }

    // Check if user is active
    if (!admin.is_active) {
      return res.status(401).json({
        status: false,
        message: "Admin account De-activated ",
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: false,
        message: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Token expired",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

module.exports = {
  generateAuthToken,
  authenticateToken,
  authenticateTokenForAdmin
};
