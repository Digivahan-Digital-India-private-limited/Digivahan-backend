const Admin = require("../models/admin.model");
const AdminPermissions = require("../models/adminPermissions.model");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/revokedTokenSchema");
const redis = require("../utils/redis");
const { generateOTP, sendOTP } = require("../utils/otpUtils");
const { generateAuthToken } = require("../middleware/auth");

const SignInAdmin = async (req, res) => {
  try {
    const { phone } = req.body;

    /* ===============================
       1️⃣ Validate phone numbere
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

const MasterSignInAdmin = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ status: false, message: "Valid phone number is required" });
    }

    const adminPhones = (process.env.ADMIN_PHONES || "").split(",");
    if (!adminPhones.includes(phone)) {
      return res.status(403).json({ status: false, message: "Not authorized as Master Admin" });
    }

    const admin = await Admin.findOne({ phone, is_active: true }, { _id: 1, phone: 1 }).lean();
    if (!admin) {
      return res.status(404).json({ status: false, message: "Admin not registered" });
    }

    const otpCode = generateOTP(6);
    const redisKey = `masteradmin:otp:${phone}`;
    await redis.set(redisKey, otpCode, "EX", 600);

    const otpSent = await sendOTP(phone, otpCode, "PHONE", "login");
    if (!otpSent) {
      await redis.del(redisKey);
      return res.status(500).json({ status: false, message: "Failed to send OTP. Please try again." });
    }

    return res.status(200).json({
      status: true,
      message: `OTP sent successfully to ${phone}`,
      valid_until: new Date(Date.now() + 600000).toISOString(),
    });
  } catch (error) {
    console.error("Master Admin SignIn OTP Error:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const verifyMasterAdminOTP = async (req, res) => {
  try {
    const { phone, OtpCode } = req.body;

    if (!phone || !OtpCode) {
      return res.status(400).json({ status: false, message: "phone and OtpCode are required" });
    }

    const adminPhones = (process.env.ADMIN_PHONES || "").split(",");
    if (!adminPhones.includes(phone)) {
      return res.status(403).json({ status: false, message: "Not authorized as Master Admin" });
    }

    const redisKey = `masteradmin:otp:${phone}`;
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp || storedOtp !== OtpCode) {
      return res.status(400).json({ status: false, message: "Invalid or expired OTP" });
    }

    await redis.del(redisKey);

    const admin = await Admin.findOne({ phone, is_active: true }).lean();
    if (!admin) {
      return res.status(404).json({ status: false, message: "Admin not registered" });
    }

    const token = generateAuthToken({
      user_id: admin._id,
      email: admin.email,
      phone_number: admin.phone,
      isMasterAdmin: true,
    });

    await Admin.updateOne({ _id: admin._id }, { $set: { last_login: new Date() } });

    return res.status(200).json({
      status: true,
      message: "Master Admin login successful",
      token,
      admin: {
        user_id: admin._id,
        phone: admin.phone,
        email: admin.email,
        name: `${admin.first_name} ${admin.last_name}`,
        isMasterAdmin: true,
      },
    });
  } catch (error) {
    console.error("Verify Master Admin OTP Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, {
      _id: 1, first_name: 1, last_name: 1, phone: 1, email: 1, role: 1, is_active: 1, createdAt: 1
    }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ status: true, admins });
  } catch (error) {
    console.error("List Admins Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// All page keys — must match exactly what Sidebar.jsx and ManageAdminPermissions.jsx use
const ALL_PAGE_KEYS = [
  "dashboard",
  "orders",
  "qr_management",
  "user_management",
  "analytics",
  "customer_queries",
  "raise_concern",
  "delete_account_requests",
  "report_issue",
  "manage_appointment",
  "challan_webhook",
  "app_management",
  "hr_manager",
];

const addAdmin = async (req, res) => {
  try {
    const { first_name, last_name, phone, email } = req.body;
    if (!first_name || !phone || !email) {
      return res.status(400).json({ status: false, message: "first_name, phone, and email are required" });
    }
    const existing = await Admin.findOne({ $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(400).json({ status: false, message: "Admin with this phone or email already exists" });
    }
    const newAdmin = new Admin({
      first_name,
      last_name: last_name || "",
      phone,
      email,
      role: "admin",
      is_active: true,
    });
    await newAdmin.save();

    // ✅ Create default permissions — ALL pages set to FALSE (no access by default)
    // Master Admin must explicitly grant access to each page after creation.
    const defaultPages = {};
    ALL_PAGE_KEYS.forEach(key => { defaultPages[key] = false; });
    await AdminPermissions.create({
      admin_id: newAdmin._id,
      pages: defaultPages,
    });

    return res.status(201).json({
      status: true,
      message: "Admin added successfully. No page access granted yet — please configure permissions.",
      admin: newAdmin,
    });
  } catch (error) {
    console.error("Add Admin Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ status: false, message: "Admin not found" });
    }
    return res.status(200).json({ status: true, message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Delete Admin Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ── Get permissions for a specific admin (master admin only) ──
const getAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const doc = await AdminPermissions.findOne({ admin_id: adminId }).lean();
    const pages = doc?.pages || {};
    return res.status(200).json({ status: true, adminId, pages });
  } catch (error) {
    console.error("Get Permissions Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ── Update/set permissions for a specific admin (master admin only) ──
const updateAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { pages } = req.body; // { dashboard: true, orders: false, ... }
    if (!pages || typeof pages !== "object") {
      return res.status(400).json({ status: false, message: "pages object is required" });
    }
    const doc = await AdminPermissions.findOneAndUpdate(
      { admin_id: adminId },
      { $set: { pages } },
      { upsert: true, new: true, lean: true }
    );
    const updatedPages = doc.pages || {};
    return res.status(200).json({ status: true, message: "Permissions updated", pages: updatedPages });
  } catch (error) {
    console.error("Update Permissions Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// ── Get own permissions (called by logged-in admin at login time) ──
const getMyPermissions = async (req, res) => {
  try {
    const adminId = req.admin?.userId || req.user?.userId;
    if (!adminId) {
      return res.status(401).json({ status: false, message: "Unauthorized: admin ID missing" });
    }
    const doc = await AdminPermissions.findOne({ admin_id: adminId }).lean();

    // ✅ If no permissions doc exists (legacy admin), default ALL to false — no access
    // This ensures even old admins without a permission record see nothing until granted.
    if (!doc) {
      const defaultPages = {};
      ALL_PAGE_KEYS.forEach(key => { defaultPages[key] = false; });
      return res.status(200).json({ status: true, pages: defaultPages });
    }

    // Return exactly what is stored — master admin controls what is true/false
    const pages = doc.pages instanceof Map ? Object.fromEntries(doc.pages) : (doc.pages || {});
    return res.status(200).json({ status: true, pages });
  } catch (error) {
    console.error("Get My Permissions Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

module.exports = { SignInAdmin, verifyAdminOTP, LogoutAdmin, MasterSignInAdmin, verifyMasterAdminOTP, listAdmins, addAdmin, deleteAdmin, getAdminPermissions, updateAdminPermissions, getMyPermissions };
