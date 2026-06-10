const DeleteAccountRequest = require("../models/deleteAccountRequest.model");
const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment");
const mongoose = require("mongoose");



// API 1 : RAISE DELETE ACCOUNT REQUEST

exports.raiseDeleteRequest = async (req, res) => {

  try {

    const {
      name,
      phoneNumber,
      email,
      reason,
      otherReason
    } = req.body;


    // check registered user
    const user = await User.findOne({
      "basic_details.phone_number": phoneNumber
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "You are not registered user"
      });
    }

    // check if already requested
    const existingRequest = await DeleteAccountRequest.findOne({
      user_id: user._id
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "You already submitted a request for deletion."
      });
    }


    const request = new DeleteAccountRequest({

      user_id: user._id,
      name,
      phoneNumber,
      email,
      reason,
      otherReason

    });

    await request.save();

    res.status(201).json({

      success: true,
      message: "Delete account request submitted successfully",
      data: request

    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};




// API 2 : GET REQUEST LIST

exports.getDeleteRequests = async (req, res) => {

  try {

    const { status } = req.query;

    let filter = {};

    if (status) {
      filter.status = status;
    }

    const requests = await DeleteAccountRequest
      .find(filter)
      .sort({ createdAt: -1 });

    res.json({

      success: true,
      total: requests.length,
      data: requests

    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};




// API 3 : UPDATE STATUS

exports.updateDeleteRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const rawDays = req.body.deletion_days;
    const status = req.body.status;
    const days = rawDays !== undefined && rawDays !== null && rawDays !== ""
      ? Number(rawDays)
      : 30; // Default 30 days

    console.log(`[DeleteAccount] Updating request ${id} → status: ${status}, days: ${days}`);

    const request = await DeleteAccountRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // If status is checked/closed, handle deletion scheduling
    if (["checked", "closed"].includes(status)) {
      const isImmediate = days === 0;
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + days);

      console.log(`[DeleteAccount] Scheduling deletion for user ${request.user_id}. Immediate: ${isImmediate}, Date: ${deletionDate}`);

      const user = await User.findById(request.user_id);
      if (!user) {
        console.log(`[DeleteAccount] User ${request.user_id} not found!`);
      } else {
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
              deletion_type: isImmediate ? "IMMEDIATE" : "SCHEDULED",
              reason: `Admin Action: ${request.reason}${request.otherReason ? " - " + request.otherReason : ""}`,
              deletion_days: days * 24 * 60,
              deletion_date: deletionDate,
              status: isImmediate ? "COMPLETED" : "PENDING",
              qr_ids: qrList,
              qr_status: qrList.length > 0 ? "BLOCKED" : "NONE",
              isImmediate: isImmediate,
            }
          },
          { upsert: true, new: true }
        );

        await QRAssignment.updateMany(
          { assigned_to: user._id },
          { status: "inactive" }
        );

        if (isImmediate) {
          await User.findByIdAndDelete(user._id);
          console.log(`[DeleteAccount] User ${user._id} IMMEDIATELY deleted`);
        } else {
          await User.findByIdAndUpdate(user._id, {
            $set: {
              deletion_date: deletionDate,
              account_status: "PENDING_DELETION",
            }
          });
          console.log(`[DeleteAccount] User ${user._id} scheduled for deletion on ${deletionDate}`);
        }
      }
    }

    res.json({
      success: true,
      message: days === 0
        ? "Account deleted immediately"
        : `Request status updated. Account scheduled for deletion in ${days} day(s).`,
      data: request,
    });

  } catch (error) {
    console.error("[DeleteAccount] Error in updateDeleteRequestStatus:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// API 4 : GET USER DELETION STATUS (For Frontend)
exports.getDeleteRequestStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("Checking deletion status for userId:", userId);

    // Check if user has an active deletion scheduled
    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (user && user.account_status === "PENDING_DELETION" && user.deletion_date) {
      const now = new Date();
      const deletionDate = new Date(user.deletion_date);
      const timeDiff = deletionDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      console.log("Found SCHEDULED deletion for user");
      return res.json({
        success: true,
        data: {
          status: "SCHEDULED",
          daysLeft: daysLeft > 0 ? daysLeft : 0,
          deletionDate: user.deletion_date
        }
      });
    }

    // Check if user has any existing request
    const pendingRequest = await DeleteAccountRequest.findOne({
      user_id: new mongoose.Types.ObjectId(userId)
    }).sort({ createdAt: -1 });

    if (pendingRequest) {
      console.log("Found IN_PROGRESS request:", pendingRequest._id);
      return res.json({
        success: true,
        data: {
          status: "IN_PROGRESS"
        }
      });
    }

    console.log("No deletion status found for user (NONE)");
    return res.json({
      success: true,
      data: {
        status: "NONE"
      }
    });

  } catch (error) {
    console.error("Error in getDeleteRequestStatus:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// API 5 : DELETE/REJECT REQUEST (Admin)
exports.deleteRequestByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await DeleteAccountRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    // Restore user if they were scheduled for deletion
    const user = await User.findById(request.user_id);
    if (user && user.account_status === "PENDING_DELETION") {
      user.account_status = "ACTIVE";
      user.deletion_date = null;
      await user.save();

      // Delete the UserDeletion record
      await UserDeletion.deleteMany({ user_id: user._id, status: "PENDING" });
    }

    // Delete the request
    await DeleteAccountRequest.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Request rejected and deleted successfully."
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};