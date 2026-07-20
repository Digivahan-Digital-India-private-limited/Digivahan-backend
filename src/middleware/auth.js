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
    let user = await User.findById(decoded.userId);
    let isAdmin = false;

    if (!user) {
      user = await Admin.findById(decoded.userId);
      if (user) isAdmin = true;
    }

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Invalid token - user not found",
      });
    }

    // Check if user/admin is active
    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        message: isAdmin ? "Admin account De-activated" : ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 BLOCKED check — deny ALL API access for blocked users
    if (!isAdmin && user.account_status === "BLOCKED") {
      return res.status(403).json({
        status: false,
        error_type: "blocked",
        message: "Your account has been blocked by admin. You cannot use any service.",
        reason: user.blocked_reason || "Blocked by admin",
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
      isMasterAdmin: payloadData.isMasterAdmin || false,
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

const authenticateTokenForMasterAdmin = async (req, res, next) => {
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

    // Check if master admin flag is present in token
    if (!decoded.isMasterAdmin) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: Master Admin access required",
      });
    }

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

/**
 * Optional auth middleware — agar token ho toh userId set karo,
 * nahi ho toh silently pass karo. Public routes ke liye.
 * Analytics tracking ke liye use hota hai.
 */
const optionalAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return next(); // No token — that's OK, continue as guest
    }

    // Check if token is revoked
    const revoked = await RevokedToken.findOne({ token });
    if (revoked) {
      return next(); // Revoked token — treat as guest
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const user = await User.findById(decoded.userId).select("_id is_active").lean();

    if (user && user.is_active) {
      req.user = decoded; // ✅ userId available for analytics logging
    }

    next();
  } catch (error) {
    // Invalid or expired token — silently continue as guest
    next();
  }
};

module.exports = {
  generateAuthToken,
  authenticateToken,
  authenticateTokenForAdmin,
  authenticateTokenForMasterAdmin,
  optionalAuthToken,
};
