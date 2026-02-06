const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const { deleteFromCloudinary } = require("../middleware/cloudinary");
const calculateProfileCompletion = require("../middleware/profileCompletionCalculator");

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

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.basic_details.phone_number === phone_number) {
      return res.status(404).json({
        status: false,
        error_type: "phone_number",
        message:
          "This Phone number is already use In User Account Please use another Phone Number",
      });
    }

    // 🔍 CHECK DUPLICATE
    const isAlreadyExist = user.emergency_contacts.some((contact) => {
      return (
        contact.phone_number === phone_number ||
        contact.first_name.toLowerCase() === first_name.toLowerCase() ||
        contact.last_name.toLowerCase() === last_name.toLowerCase()
      );
    });

    if (isAlreadyExist) {
      return res.status(409).json({
        status: false,
        message: "This emergency contact is already added",
      });
    }

    let profile_pic = "";
    let public_id = "";

    // ✅ OPTIONAL IMAGE LOGIC
    if (req.file) {
      const buffer = req.file.buffer;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "uploads",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(buffer);
      });

      profile_pic = uploadResult.secure_url;
      public_id = uploadResult.public_id;
    }

    // 🧾 CREATE CONTACT (works for both cases)
    const newContact = {
      first_name,
      last_name,
      relation,
      phone_number,
      email,
      profile_pic,
      public_id,
    };

    user.emergency_contacts.push(newContact);

    // 🟢 6️⃣ Recalculate profile completion %
    user.basic_details.profile_completion_percent =
      calculateProfileCompletion(user);

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

    // 1️⃣ Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.basic_details.phone_number === phone_number) {
      return res.status(404).json({
        status: false,
        error_type: "phone_number",
        message:
          "This Phone number is already use In User Account Please use another Phone Number",
      });
    }

    // 2️⃣ Find emergency contact
    const contact = user.emergency_contacts.find((c) =>
      c._id.equals(contact_id),
    );

    if (!contact) {
      return res.status(404).json({
        status: false,
        message: "Emergency contact not found",
      });
    }

    const profilePicFile = req.file;

    // 3️⃣ PROFILE PIC LOGIC (2 CASES)
    if (profilePicFile) {
      const buffer = profilePicFile.buffer;

      // 🔹 CASE 1: old image exists → replace it
      if (contact.public_id) {
        await cloudinary.uploader.destroy(contact.public_id);
      }

      // 🔹 CASE 2: old image does NOT exist → fresh upload
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "uploads",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(buffer);
      });

      // 🔹 Save in both cases
      contact.profile_pic = uploadResult.secure_url;
      contact.public_id = uploadResult.public_id;
    }

    // 4️⃣ Update other fields
    if (first_name) contact.first_name = first_name;
    if (last_name) contact.last_name = last_name;
    if (relation) contact.relation = relation;
    if (phone_number) contact.phone_number = phone_number;
    if (email) contact.email = email;

    // 5️⃣ Save user
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
      message: error.message,
    });
  }
};

const DeleteUserEmergencyContact = async (req, res) => {
  try {
    const { user_id, contact_id } = req.body;

    // 1️⃣ Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Find contact inside emergency_contact array
    const contact = user.emergency_contacts.id(contact_id);
    if (!contact) {
      return res.status(404).json({ message: "Emergency contact not found" });
    }

    // 3️⃣ Delete profile image from Cloudinary if exists
    if (contact.public_id) {
      try {
        await deleteFromCloudinary(contact.public_id);
      } catch (err) {
        console.log("Cloudinary delete failed:", err);
      }
    }

    // 4️⃣ Remove contact from array
    user.emergency_contacts = user.emergency_contacts.filter(
      (item) => item._id.toString() !== contact_id,
    );

    // 5️⃣ Save updated user
    await user.save();

    return res.status(200).json({
      message: "Emergency contact deleted successfully",
      emergency_contact: user.emergency_contacts,
    });
  } catch (error) {
    console.error("DeleteUserEmergencyContact Error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

module.exports = {
  AddEmergencyContact,
  UpdateUserEmergencyContact,
  DeleteUserEmergencyContact,
};
