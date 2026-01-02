// controllers/DeleteUserByAdmin.js

const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment");

const DeleteByUser = async (req, res) => {
  try {
    const { user_id, reason } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 🔍 Fetch all active QR codes assigned to user
    const assignedQRCodes = await QRAssignment.find({
      user_id: user_id,
      status: "active",
    });

    const qrList = assignedQRCodes.map((qr) => qr.qr_id);

    // ======================================================
    // 🚀 Schedule auto deletion after 30 days
    // ======================================================

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30); // Auto-set 30 days

    await UserDeletion.create({
      user_id,
      deletion_type: "SCHEDULED",
      reason,
      deletion_days: 30 * 24 * 60, // For info (not used)
      deletion_date: deletionDate,
      status: "PENDING",
      qr_ids: qrList,
      qr_status: qrList.length > 0 ? "BLOCKED" : "NONE",
      isImmediate: false,
    });

    // 2️⃣ Update deletion_date & account_status in User schema
    user.deletion_date = deletionDate;
    user.account_status = "PENDING_DELETION";
    await user.save();

    // ⭐ 3️⃣ UPDATE QR STATUS → inactive (NEWLY ADDED)
    await QRAssignment.updateMany({ user_id: user_id }, { status: "inactive" });

    // User informed
    return res.status(200).json({
      status: true,
      message: "Your account will be deleted after 30 days.",
      deletion_date: deletionDate,
      qr_ids: qrList,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};


module.exports = { DeleteByUser };
