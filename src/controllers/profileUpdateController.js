const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const { deleteFromCloudinary } = require("../middleware/cloudinary");
const mongoose = require("mongoose");

const UpdateUserDetails = async (req, res) => {
  try {
    const { user_id, ...body } = req.body;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(user_id).select(
      "basic_details public_details emergency_contacts"
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    let oldProfilePublicId = user.basic_details.public_id || null;
    let oldPublicPublicId = user.public_details.public_id || null;

    let newProfileImage = null;
    let newPublicImage = null;

    // ==============================
    // 🔥 Upload Profile Pic (if exists)
    // ==============================
    if (req.files?.profile_pic?.[0]) {
      const buffer = req.files.profile_pic[0].buffer;

      newProfileImage = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "user/profile", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      user.basic_details.profile_pic = newProfileImage.secure_url;
      user.basic_details.public_id = newProfileImage.public_id;
    }

    // ==============================
    // 🔥 Upload Public Pic (if exists)
    // ==============================
    if (req.files?.public_pic?.[0]) {
      const buffer = req.files.public_pic[0].buffer;

      newPublicImage = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "user/public", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      user.public_details.public_pic = newPublicImage.secure_url;
      user.public_details.public_id = newPublicImage.public_id;
    }

    // ==============================
    // 🔥 Update other fields
    // ==============================
    if (body.first_name)
      user.basic_details.first_name = body.first_name.trim();

    if (body.last_name)
      user.basic_details.last_name = body.last_name.trim();

    if (body.occupation)
      user.basic_details.occupation = body.occupation.trim();

    if (body.nick_name)
      user.public_details.nick_name = body.nick_name.trim();

    if (body.address)
      user.public_details.address = body.address.trim();

    if (body.age !== undefined)
      user.public_details.age = body.age;

    if (body.gender)
      user.public_details.gender = body.gender;

    await user.save();

    // ==============================
    // 🔥 Delete OLD images after successful save
    // ==============================
    if (oldProfilePublicId && newProfileImage) {
      deleteFromCloudinary(oldProfilePublicId).catch(console.error);
    }

    if (oldPublicPublicId && newPublicImage) {
      deleteFromCloudinary(oldPublicPublicId).catch(console.error);
    }

    return res.status(200).json({
      status: true,
      message: "User details updated successfully.",
      basic_details: user.basic_details,
      public_details: user.public_details,
    });
  } catch (error) {
    console.error("UpdateUserDetails error:", error);

    // 🔥 If upload happened but save failed → rollback new images
    if (newProfileImage?.public_id) {
      await deleteFromCloudinary(newProfileImage.public_id).catch(() => {});
    }

    if (newPublicImage?.public_id) {
      await deleteFromCloudinary(newPublicImage.public_id).catch(() => {});
    }

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};


// Get user Basic details
const getUserDetails = async (req, res) => {
  try {
    const { user_id, details_type } = req.body;

    if (!user_id || !details_type) {
      return res.status(400).json({
        success: false,
        message: "user_id and details_type are required",
      });
    }

    const validTypes = [
      "basic_details",
      "public_details",
      "address_book",
      "chat_box",
      "emergency_contacts",
      "garage",
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
        message: "Invalid details_type",
      });
    }

    // 🔥 ALL CASE
    if (details_type === "all") {
      const user = await User.findById(user_id)
        .select("-basic_details.password")
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Full user details",
        data: user,
      });
    }

    // 🔥 BASIC DETAILS (password excluded automatically)
    if (details_type === "basic_details") {
      const user = await User.findById(user_id)
        .select("-basic_details.password")
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Basic details fetched",
        data: user.basic_details,
      });
    }

    // 🔥 Suspension reason (single field)
    if (details_type === "suspension_reason") {
      const user = await User.findById(user_id)
        .select("suspension_reason -_id")
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Suspension reason fetched",
        data: { suspension_reason: user.suspension_reason },
      });
    }

    // 🔥 Generic case (ONLY requested field)
    const user = await User.findById(user_id)
      .select(`${details_type} -_id`)
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `${details_type} fetched`,
      data: user[details_type] || null,
    });
  } catch (error) {
    console.error("getUserDetails error →", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { UpdateUserDetails, getUserDetails };
