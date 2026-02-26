const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const { deleteFromCloudinary } = require("../middleware/cloudinary");
const mongoose = require("mongoose");

const AddEmergencyContact = async (req, res) => {
  try {
    const { user_id, first_name, last_name, relation, phone_number, email } =
      req.body;

    if (!user_id || !first_name || !phone_number) {
      return res.status(400).json({
        status: false,
        message: "Required fields are missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user ID",
      });
    }

    // 🔥 Fetch only required fields
    const user = await User.findById(user_id).select(
      "basic_details public_details emergency_contacts",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const normalizedPhone = phone_number.trim();
    const normalizedFirstName = first_name.trim().toLowerCase();
    const normalizedLastName = last_name?.trim().toLowerCase() || "";

    // 🚫 User cannot add his own number
    if (user.basic_details.phone_number === normalizedPhone) {
      return res.status(400).json({
        status: false,
        error_type: "phone_number",
        message: "This phone number already belongs to the user account",
      });
    }

    // 🔍 Duplicate check (phone OR full name match)
    const duplicate = user.emergency_contacts.some((contact) => {
      return (
        contact.phone_number === normalizedPhone ||
        (contact.first_name?.toLowerCase() === normalizedFirstName &&
          contact.last_name?.toLowerCase() === normalizedLastName)
      );
    });

    if (duplicate) {
      return res.status(409).json({
        status: false,
        message: "This emergency contact is already added",
      });
    }

    // =============================
    // 🔥 Optional Image Upload
    // =============================
    let profile_pic = "";
    let public_id = "";

    if (req.file?.buffer) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "emergency_contacts", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(req.file.buffer);
      });

      profile_pic = uploadResult.secure_url;
      public_id = uploadResult.public_id;
    }

    // 🔥 Push contact
    user.emergency_contacts.push({
      first_name: first_name.trim(),
      last_name: last_name?.trim() || "",
      relation: relation?.trim() || "",
      phone_number: normalizedPhone,
      email: email?.trim().toLowerCase() || "",
      profile_pic,
      public_id,
    });

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Emergency contact added successfully",
      emergency_contacts: user.emergency_contacts,
    });
  } catch (error) {
    console.error("AddEmergencyContact error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const UpdateUserEmergencyContact = async (req, res) => {
  try {
    const {
      user_id,
      contact_id,
      first_name,
      last_name,
      relation,
      phone_number,
      email,
    } = req.body;

    if (!user_id || !contact_id) {
      return res.status(400).json({
        status: false,
        message: "user_id and contact_id are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(contact_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid ID format",
      });
    }

    // 🔥 Fetch only required fields
    const user = await User.findById(user_id).select(
      "basic_details public_details emergency_contacts",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 🔥 Find contact
    const contact = user.emergency_contacts.id(contact_id);

    if (!contact) {
      return res.status(404).json({
        status: false,
        message: "Emergency contact not found",
      });
    }

    const normalizedPhone = phone_number?.trim();

    // 🚫 Prevent using user's own number
    if (
      normalizedPhone &&
      user.basic_details.phone_number === normalizedPhone
    ) {
      return res.status(400).json({
        status: false,
        error_type: "phone_number",
        message: "This phone number already belongs to the user account",
      });
    }

    // 🔍 Duplicate phone check (excluding current contact)
    if (normalizedPhone) {
      const duplicate = user.emergency_contacts.some(
        (c) =>
          c._id.toString() !== contact_id && c.phone_number === normalizedPhone,
      );

      if (duplicate) {
        return res.status(409).json({
          status: false,
          message: "This phone number already exists in emergency contacts",
        });
      }
    }

    // =============================
    // 🔥 Profile Pic Update
    // =============================
    if (req.file?.buffer) {
      // Delete old image if exists
      if (contact.public_id) {
        await cloudinary.uploader
          .destroy(contact.public_id)
          .catch(console.error);
      }

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "emergency_contacts", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(req.file.buffer);
      });

      contact.profile_pic = uploadResult.secure_url;
      contact.public_id = uploadResult.public_id;
    }

    // =============================
    // 🔥 Update Fields (Safe + Trim)
    // =============================
    if (first_name !== undefined) contact.first_name = first_name.trim();

    if (last_name !== undefined) contact.last_name = last_name.trim();

    if (relation !== undefined) contact.relation = relation.trim();

    if (normalizedPhone) contact.phone_number = normalizedPhone;

    if (email !== undefined) contact.email = email.trim().toLowerCase();

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Emergency contact updated successfully",
      data: contact,
    });
  } catch (error) {
    console.error("UpdateUserEmergencyContact error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const DeleteUserEmergencyContact = async (req, res) => {
  try {
    const { user_id, contact_id } = req.body;

    if (!user_id || !contact_id) {
      return res.status(400).json({
        status: false,
        message: "user_id and contact_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(contact_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid ID format",
      });
    }

    // 🔥 Fetch only required fields
    const user = await User.findById(user_id).select(
      "basic_details public_details emergency_contacts",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const contact = user.emergency_contacts.id(contact_id);

    if (!contact) {
      return res.status(404).json({
        status: false,
        message: "Emergency contact not found",
      });
    }

    const oldPublicId = contact.public_id || null;

    // 🔥 Remove contact using mongoose built-in method
    contact.deleteOne();

    await user.save();

    // 🔥 Delete image AFTER successful save (non-blocking)
    if (oldPublicId) {
      deleteFromCloudinary(oldPublicId).catch(console.error);
    }

    return res.status(200).json({
      status: true,
      message: "Emergency contact deleted successfully",
      emergency_contacts: user.emergency_contacts,
    });
  } catch (error) {
    console.error("DeleteUserEmergencyContact Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  AddEmergencyContact,
  UpdateUserEmergencyContact,
  DeleteUserEmergencyContact,
};
