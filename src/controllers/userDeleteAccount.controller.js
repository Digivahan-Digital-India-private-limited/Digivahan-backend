const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment");
const DeleteAccountRequest = require("../models/deleteAccountRequest.model");
const mongoose = require("mongoose");

// Helper: format a Date as "dd/MM/yyyy"
const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};


// ─────────────────────────────────────────────
// API 1 : SUBMIT DELETE ACCOUNT REQUEST (User)
// POST /api/user-account/delete
// ─────────────────────────────────────────────
exports.submitDeleteRequest = async (req, res) => {
  try {
    const { id, duration, reason, deviceType } = req.body;

    // ── Validate required fields ──
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id (userId or phoneNumber) is required.",
      });
    }

    if (duration === undefined || duration === null || duration === "") {
      return res.status(400).json({
        success: false,
        message: "duration is required.",
      });
    }

    const durationDays = Number(duration);
    if (!Number.isInteger(durationDays) || durationDays < 0) {
      return res.status(400).json({
        success: false,
        message: "duration must be a non-negative integer.",
      });
    }

    if (!deviceType || !["android", "ios", "web"].includes(deviceType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "deviceType must be 'android', 'ios', or 'web'.",
      });
    }

    // ── Find user: try ObjectId first, then phoneNumber ──
    let user = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }

    if (!user) {
      const cleanId = String(id).trim();
      user = await User.findOne({
        $or: [
          { "basic_details.phone_number": cleanId },
          { phoneNumber: cleanId },
          { phone_number: cleanId },
        ],
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ── If duration = 0 → delete immediately ──
    if (durationDays === 0) {
      const assignedQRCodes = await QRAssignment.find({
        assigned_to: user._id,
        status: "active",
      }).select("qr_id");
      const qrList = assignedQRCodes.map((qr) => qr.qr_id);

      await UserDeletion.findOneAndUpdate(
        { user_id: user._id },
        {
          $set: {
            user_id: user._id,
            deletion_type: "IMMEDIATE",
            reason: reason || "User requested immediate deletion",
            deletion_days: 0,
            deletion_date: new Date(),
            status: "COMPLETED",
            qr_ids: qrList,
            qr_status: qrList.length > 0 ? "BLOCKED" : "NONE",
            isImmediate: true,
          },
        },
        { upsert: true, new: true }
      );

      if (qrList.length > 0) {
        await QRAssignment.updateMany(
          { assigned_to: user._id },
          { status: "inactive" }
        );
      }

      // Record in DeleteAccountRequest for admin audit
      await DeleteAccountRequest.findOneAndUpdate(
        { user_id: user._id },
        {
          $set: {
            user_id: user._id,
            name: user.basic_details?.full_name || user.fullName || "User",
            phoneNumber: user.basic_details?.phone_number || user.phoneNumber || String(id),
            email: user.basic_details?.email || user.email || "",
            reason: reason || "User requested immediate deletion via app",
            deviceType: deviceType.toLowerCase(),
            duration: 0,
            deleteRequestDate: formatDate(new Date()),
            deleteRequestProcessDate: formatDate(new Date()),
            status: "completed",
          }
        },
        { upsert: true, new: true }
      );

      await User.findByIdAndDelete(user._id);

      return res.status(200).json({
        success: true,
        message: "Account has been deleted immediately.",
      });
    }

    // ── duration > 0 → schedule deletion ──
    const today = new Date();
    const processDate = new Date();
    processDate.setDate(today.getDate() + durationDays);

    const deletionRequestData = {
      deleteStatus: true,
      deleteRequestDate: formatDate(today),
      deleteRequestProcessDate: formatDate(processDate),
      deleteRequestProcessDays: durationDays,
    };

    await User.findByIdAndUpdate(user._id, {
      $set: {
        deletionRequestData,
        account_status: "PENDING_DELETION",
        deletion_date: processDate,
      },
    });

    // Also record in UserDeletion for daily cron processing
    await UserDeletion.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          user_id: user._id,
          deletion_type: "SCHEDULED",
          reason: reason || "User requested scheduled deletion",
          deletion_days: durationDays * 24 * 60,
          deletion_date: processDate,
          status: "PENDING",
          isImmediate: false,
        },
      },
      { upsert: true, new: true }
    );

    // Save/Update in DeleteAccountRequest collection for Admin Panel
    await DeleteAccountRequest.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          user_id: user._id,
          name: user.basic_details?.full_name || user.fullName || "User",
          phoneNumber: user.basic_details?.phone_number || user.phoneNumber || String(id),
          email: user.basic_details?.email || user.email || "",
          reason: reason || "Account deletion request submitted via app",
          deviceType: deviceType.toLowerCase(),
          duration: durationDays,
          deleteRequestDate: deletionRequestData.deleteRequestDate,
          deleteRequestProcessDate: deletionRequestData.deleteRequestProcessDate,
          status: "pending",
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Delete account request submitted successfully.",
      deletionRequestData,
    });

  } catch (error) {
    console.error("[UserDeleteAccount] submitDeleteRequest error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// ─────────────────────────────────────────────
// API 2 : CANCEL DELETE ACCOUNT REQUEST (User)
// POST /api/user-account/cancel-delete
// ─────────────────────────────────────────────
exports.cancelDeleteRequest = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user identifier.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const hasActiveRequest =
      user.deletionRequestData && user.deletionRequestData.deleteStatus === true;

    if (!hasActiveRequest) {
      return res.status(400).json({
        success: false,
        message: "No active account deletion request found.",
      });
    }

    const cancelledDeletionData = {
      deleteStatus: false,
      deleteRequestDate: null,
      deleteRequestProcessDate: null,
      deleteRequestProcessDays: null,
    };

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $set: {
          deletionRequestData: cancelledDeletionData,
          account_status: "ACTIVE",
          deletion_date: null,
        },
      }),
      UserDeletion.deleteMany({ user_id: userId, status: "PENDING" }),
      QRAssignment.updateMany(
        { assigned_to: userId },
        { $set: { status: "active" } }
      ),
      DeleteAccountRequest.updateMany(
        { user_id: userId, status: { $ne: "completed" } },
        {
          $set: {
            status: "cancelled",
            otherReason: `Cancelled by user on ${formatDate(new Date())}`,
          },
        }
      ),
    ]);

    return res.status(200).json({
      success: true,
      message: "Account deletion request cancelled successfully.",
      deletionRequestData: {
        deleteStatus: false,
      },
    });

  } catch (error) {
    console.error("[UserDeleteAccount] cancelDeleteRequest error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
