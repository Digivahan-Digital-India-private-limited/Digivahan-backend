const jwt = require("jsonwebtoken");
const User = require("../models/User");
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
      process.env.JWT_SECRET || "your-secret-key"
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

    // Check if user is suspended
    if (user.isSuspended()) {
      const suspensionStatus = user.getSuspensionStatus();
      return res.status(403).json({
        status: false,
        message: ERROR_MESSAGES.USER_SUSPENDED,
        data: {
          suspended_until: suspensionStatus.suspendedUntil,
          reason: suspensionStatus.reason,
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

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId);

    if (user && user.is_active && !user.isSuspended()) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
