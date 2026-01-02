const User = require("../models/User");
const { deleteFromCloudinary } = require("../middleware/cloudinary");

const UpdateUserDetails = async (req, res) => {
  try {
    const {
      user_id,
      first_name,
      last_name,
      email,
      phone_number,
      occupation,
      nick_name,
      address,
      age,
      gender,
    } = req.body;

    // ===== 1️⃣ Find existing user =====
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 🔥 Store old public_ids (for deletion later)
    let oldProfilePublicId = null;
    let oldPublicPublicId = null;

    // ===== 2️⃣ Profile Pic Update =====
    if (req.files?.profile_pic?.[0]?.path) {
      oldProfilePublicId = user.basic_details.public_id || null;

      user.basic_details.profile_pic = req.files.profile_pic[0].path;
      user.basic_details.public_id = req.files.profile_pic[0].filename;
    }

    // ===== 3️⃣ Public Pic Update =====
    if (req.files?.public_pic?.[0]?.path) {
      oldPublicPublicId = user.public_details.public_id || null;

      user.public_details.public_pic = req.files.public_pic[0].path;
      user.public_details.public_id = req.files.public_pic[0].filename;
    }

    // ===== 4️⃣ Update basic details =====
    if (first_name) user.basic_details.first_name = first_name;
    if (last_name) user.basic_details.last_name = last_name;
    if (email) {
      user.basic_details.email = email;
      user.basic_details.is_email_primary = false;
      user.basic_details.is_email_verified = false;
    }
    if (phone_number) user.basic_details.phone_number = phone_number;
    if (occupation) user.basic_details.occupation = occupation;

    // ===== 5️⃣ Update public details =====
    if (nick_name) user.public_details.nick_name = nick_name;
    if (address) user.public_details.address = address;
    if (age !== undefined) user.public_details.age = age;
    if (gender) user.public_details.gender = gender;

    // 🟢 6️⃣ Recalculate profile completion %
    user.basic_details.profile_completion_percent =
      calculateProfileCompletion(user);

    // ===== 6️⃣ Save user first =====
    await user.save();

    // ===== 7️⃣ Delete old images AFTER save =====
    if (oldProfilePublicId) {
      deleteFromCloudinary(oldProfilePublicId).catch(console.error);
    }

    if (oldPublicPublicId) {
      deleteFromCloudinary(oldPublicPublicId).catch(console.error);
    }

    // ===== 8️⃣ Response =====
    return res.status(200).json({
      status: true,
      message: "User details updated successfully.",
      basic_details: user.basic_details,
      public_details: user.public_details,
    });
  } catch (error) {
    console.error("UpdateUserDetails error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user Basic details
const getUserDetails = async (req, res) => {
  try {
    const { user_id, details_type } = req.body;

    // Validate input
    if (!user_id || !details_type) {
      return res.status(400).json({
        success: false,
        message: "user_id and details_type are required",
      });
    }

    // Allowed keys
    const validTypes = [
      "basic_details",
      "public_details",
      "address_book",
      "chat_box",
      "emergency_contacts",
      "garage",
      "live_tracking",
      "notifications",
      "my_orders",
      "suspended_until",
      "suspension_reason",
      "account_status",
      "deletion_date",
      "is_active",
      "is_logged_in",
      "all",
    ];

    if (!validTypes.includes(details_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid details_type. Allowed: ${validTypes.join(", ")}`,
      });
    }

    // Fetch full user
    let user = await User.findById(user_id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ------------------------------------------
    // SPECIAL CASE: ALL → RETURN FULL USER OBJECT
    // ------------------------------------------
    if (details_type === "all") {
      // Hide password for safety
      if (user.basic_details?.password) {
        user.basic_details.password = undefined;
      }

      return res.status(200).json({
        success: true,
        message: "Full user details",
        data: user,
      });
    }

    // ----------------------------------------------------
    // SPECIAL CASE: BASIC DETAILS (HIDE PASSWORD)
    // ----------------------------------------------------
    if (details_type === "basic_details") {
      const cleanBasic = {
        ...user.basic_details,
        password: undefined, // hide password
      };

      return res.status(200).json({
        success: true,
        message: "Basic details fetched",
        data: cleanBasic,
      });
    }

    // ----------------------------------------------------
    // SPECIAL CASE: suspension_reason
    // RETURN ONLY { suspension_reason: "…" }
    // ----------------------------------------------------
    if (details_type === "suspension_reason") {
      return res.status(200).json({
        success: true,
        message: "Suspension reason fetched",
        data: { suspension_reason: user.suspension_reason },
      });
    }

    // ----------------------------------------------------
    // GENERIC CASE (public_details, garage, address_book etc.)
    // Return that single field
    // ----------------------------------------------------
    const data = user[details_type]; // dynamic access: user["public_details"]

    return res.status(200).json({
      success: true,
      message: `${details_type} fetched`,
      data: data || null,
    });
  } catch (error) {
    console.log("getUserDetails error →", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Profile Updation Process
const PROFILE_FIELDS = {
  basic_details: [
    "profile_pic",
    "first_name",
    "last_name",
    "phone_number",
    "email",
    "occupation",
  ],
  public_details: ["public_pic", "nick_name", "address", "age", "gender"],
};

const TOTAL_FIELDS =
  PROFILE_FIELDS.basic_details.length + PROFILE_FIELDS.public_details.length;
const PER_FIELD_PERCENT = Math.floor(100 / TOTAL_FIELDS);

// Calculator profile percentage function
const calculateProfileCompletion = (user) => {
  let completed = 0;

  PROFILE_FIELDS.basic_details.forEach((field) => {
    const val = user.basic_details?.[field];
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      completed++;
    }
  });

  PROFILE_FIELDS.public_details.forEach((field) => {
    const val = user.public_details?.[field];
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      completed++;
    }
  });

  // 🔥 IMPORTANT FIX
  if (completed === TOTAL_FIELDS) {
    return 100;
  }

  return Math.min(completed * PER_FIELD_PERCENT, 100);
};

module.exports = { UpdateUserDetails, getUserDetails };
