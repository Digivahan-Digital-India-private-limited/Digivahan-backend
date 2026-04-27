// controllers/DeleteUserByAdmin.js

const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment");

const DeleteByUser = async (req, res) => {
  try {
    const { user_id, reason, deletion_days } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    // ✅ Validate deletion_days if provided
    if (
      deletion_days !== undefined &&
      (isNaN(deletion_days) || deletion_days < 0 || deletion_days > 30)
    ) {
      return res.status(400).json({
        status: false,
        message: "deletion_days must be between 0 and 30",
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
    // 🔀 Determine: Immediate OR Scheduled deletion
    // ======================================================

    const days = deletion_days !== undefined ? Number(deletion_days) : 30; // Default → 30
    const isImmediate = days === 0;

    // ======================================================
    // ⚡ CASE 1: IMMEDIATE DELETION (deletion_days = 0)
    // ======================================================

    if (isImmediate) {
      // Block / delete all QR assignments
      await QRAssignment.updateMany({ user_id: user_id }, { status: "inactive" });

      // Log deletion record
      await UserDeletion.create({
        user_id,
        deletion_type: "IMMEDIATE",
        reason,
        deletion_days: 0,
        deletion_date: new Date(),
        status: "COMPLETED",
        qr_ids: qrList,
        qr_status: qrList.length > 0 ? "BLOCKED" : "NONE",
        isImmediate: true,
      });

      // ❌ Hard delete the user
      await User.findByIdAndDelete(user_id);

      return res.status(200).json({
        status: true,
        message: "Your account has been deleted immediately.",
        deletion_date: new Date(),
        qr_ids: qrList,
      });
    }

    // ======================================================
    // 🕐 CASE 2 & 3: SCHEDULED DELETION (1–30 days or default 30)
    // ======================================================

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + days);

    await UserDeletion.create({
      user_id,
      deletion_type: "SCHEDULED",
      reason,
      deletion_days: days * 24 * 60, // stored in minutes (for info)
      deletion_date: deletionDate,
      status: "PENDING",
      qr_ids: qrList,
      qr_status: qrList.length > 0 ? "BLOCKED" : "NONE",
      isImmediate: false,
    });

    // Update user account status
    user.deletion_date = deletionDate;
    user.account_status = "PENDING_DELETION";
    await user.save();

    // Block QR codes
    await QRAssignment.updateMany({ user_id: user_id }, { status: "inactive" });

    return res.status(200).json({
      status: true,
      message: `Your account will be deleted after ${days} day(s).`,
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
