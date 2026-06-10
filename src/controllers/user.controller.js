const User = require("../models/User");
const QRAssignment = require("../models/QRAssignment");
const ChallanWebhook = require("../models/ChallanWebhook");
const RTOApiLog = require("../models/RTOApiLog");
const { sendGraphEmail, getMailOptions } = require("../utils/sendEmail");

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "ACTIVE";
    const skip = (page - 1) * limit;

    let matchStage = {};
    if (status !== "ALL") {
      matchStage.account_status = status;
    }

    if (search.trim()) {
      matchStage.$or = [
        { "basic_details.first_name": { $regex: search, $options: "i" } },
        { "basic_details.last_name": { $regex: search, $options: "i" } },
        { "basic_details.phone_number": { $regex: search, $options: "i" } },
        { "basic_details.email": { $regex: search, $options: "i" } },
        { "public_details.nick_name": { $regex: search, $options: "i" } },
      ];
    }

    const [result] = await User.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          users: [
            { $skip: skip },
            { $limit: limit },
            // Remove password fields
            {
              $project: {
                "basic_details.password": 0,
                old_passwords: 0,
              },
            },
            // Lookup active QR count from QRAssignment
            {
              $lookup: {
                from: "qrassignments",
                let: { userId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$assigned_to", "$$userId"] },
                      qr_status: "assigned",
                      status: "active",
                    },
                  },
                  { $count: "count" },
                ],
                as: "_activeQrLookup",
              },
            },
            // Flatten count into a single field
            {
              $addFields: {
                active_qr_count: {
                  $ifNull: [{ $arrayElemAt: ["$_activeQrLookup.count", 0] }, 0],
                },
              },
            },
            { $project: { _activeQrLookup: 0 } },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const users = result?.users || [];
    const totalCount = result?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.checkUserByPhone = async (req, res) => {
  try {

    const { phoneNumber } = req.body;

    const user = await User.findOne({
      "basic_details.phone_number": phoneNumber,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not registered",
      });
    }

    // NAME LOGIC
    let name = "";

    if (user.public_details?.nick_name && user.public_details.nick_name.trim() !== "") {
      name = user.public_details.nick_name;
    } else {
      const firstName = user.basic_details?.first_name || "";
      const lastName = user.basic_details?.last_name || "";
      name = `${firstName} ${lastName}`.trim();
    }

    // PROFILE PIC LOGIC
    let profileUrl = "";

    if (user.public_details?.public_pic && user.public_details.public_pic.trim() !== "") {
      profileUrl = user.public_details.public_pic;
    } else {
      profileUrl = user.basic_details?.profile_pic || "";
    }

    return res.json({
      success: true,
      userId: user._id,
      name: name,
      profileUrl: profileUrl,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message,
    });

  }
};

/* ─────────────────────────────────────────────────────────
   GET /api/user/analytics/users
   Returns all users who have ever hit the RTO (Kashi) API,
   grouped with hit count, sorted by most hits first.
───────────────────────────────────────────────────────── */
exports.getAnalyticsUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || "").trim();
    const skip = (page - 1) * limit;

    // Aggregate: group ChallanWebhook SEARCHED records by userId
    const pipeline = [
      {
        $match: {
          userId: { $exists: true, $ne: null },
          transactionStatus: "SEARCHED",
        },
      },
      {
        $group: {
          _id: "$userId",
          hitCount: { $sum: 1 },
          lastHitAt: { $max: "$createdAt" },
          firstHitAt: { $min: "$createdAt" },
          vehicleNumbers: { $addToSet: "$rcNumber" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          hitCount: 1,
          lastHitAt: 1,
          firstHitAt: 1,
          vehicleNumbers: 1,
          "user._id": 1,
          "user.basic_details.first_name": 1,
          "user.basic_details.last_name": 1,
          "user.basic_details.phone_number": 1,
          "user.basic_details.email": 1,
          "user.basic_details.profile_pic": 1,
          "user.public_details.nick_name": 1,
          "user.public_details.public_pic": 1,
          "user.account_status": 1,
          "user.blocked_reason": 1,
        },
      },
      { $sort: { hitCount: -1, lastHitAt: -1 } },
    ];

    // Apply search filter after lookup (on user fields)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "user.basic_details.first_name": { $regex: search, $options: "i" } },
            { "user.basic_details.last_name": { $regex: search, $options: "i" } },
            { "user.basic_details.phone_number": { $regex: search, $options: "i" } },
            { "user.basic_details.email": { $regex: search, $options: "i" } },
            { "user.public_details.nick_name": { $regex: search, $options: "i" } },
            { vehicleNumbers: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Count total then paginate
    const countPipeline = [...pipeline, { $count: "total" }];
    pipeline.push({ $skip: skip }, { $limit: limit });

    const [rows, countResult] = await Promise.all([
      ChallanWebhook.aggregate(pipeline),
      ChallanWebhook.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      users: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────
   GET /api/user/analytics/user/:userId
   Returns full RTO API call history for one user.
───────────────────────────────────────────────────────── */
exports.getAnalyticsUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user, challanHits, rtoApiHits] = await Promise.all([
      User.findById(userId)
        .select("basic_details.first_name basic_details.last_name basic_details.phone_number basic_details.email basic_details.profile_pic public_details.nick_name public_details.public_pic")
        .lean(),
      // Challan (Kashi) API hits
      ChallanWebhook.find({ userId, transactionStatus: "SEARCHED" })
        .sort({ createdAt: -1 })
        .select("rcNumber createdAt")
        .lean(),
      // RTO Vehicle/Premium API hits
      RTOApiLog.find({ userId })
        .sort({ createdAt: -1 })
        .select("vehicleNumber apiType trigger createdAt")
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
      hits: challanHits,       // challan API hits (rcNumber + createdAt)
      totalHits: challanHits.length,
      rtoApiHits,              // vehicle detail API hits (vehicleNumber + apiType + trigger + createdAt)
      totalRtoApiHits: rtoApiHits.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────
   GET /api/user/analytics/rto-users
   Returns users who have triggered RTO Vehicle / Premium API,
   grouped by user with per-vehicle hit counts.
───────────────────────────────────────────────────────── */
exports.getAnalyticsRtoUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || "").trim();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const skip = (page - 1) * limit;

    let matchQuery = {
      userId: { $exists: true, $ne: null },
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchQuery.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: "$userId",
          hitCount: { $sum: 1 },
          lastHitAt: { $max: "$createdAt" },
          firstHitAt: { $min: "$createdAt" },
          vehicleNumbers: { $addToSet: "$vehicleNumber" },
          normalHits: { $sum: { $cond: [{ $eq: ["$apiType", "rto_api"] }, 1, 0] } },
          premiumHits: { $sum: { $cond: [{ $eq: ["$apiType", "rto_premium_api"] }, 1, 0] } },
          challanHits: { $sum: { $cond: [{ $eq: ["$apiType", "challan_plus_api"] }, 1, 0] } },
          addHits: { $sum: { $cond: [{ $eq: ["$trigger", "add_vehicle"] }, 1, 0] } },
          refreshHits: { $sum: { $cond: [{ $eq: ["$trigger", "refresh"] }, 1, 0] } },
          cSearchHits: { $sum: { $cond: [{ $eq: ["$trigger", "challan_search"] }, 1, 0] } },
          cRefreshHits: { $sum: { $cond: [{ $eq: ["$trigger", "challan_refresh"] }, 1, 0] } },

        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          hitCount: 1, lastHitAt: 1, firstHitAt: 1, vehicleNumbers: 1,
          normalHits: 1, premiumHits: 1, challanHits: 1, addHits: 1, refreshHits: 1, cSearchHits: 1, cRefreshHits: 1,
          "user._id": 1,
          "user.basic_details.first_name": 1,
          "user.basic_details.last_name": 1,
          "user.basic_details.phone_number": 1,
          "user.basic_details.email": 1,
          "user.basic_details.profile_pic": 1,
          "user.public_details.nick_name": 1,
          "user.public_details.public_pic": 1,
          "user.account_status": 1,
          "user.blocked_reason": 1,
        },
      },
      { $sort: { hitCount: -1, lastHitAt: -1 } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "user.basic_details.first_name": { $regex: search, $options: "i" } },
            { "user.basic_details.last_name": { $regex: search, $options: "i" } },
            { "user.basic_details.phone_number": { $regex: search, $options: "i" } },
            { "user.basic_details.email": { $regex: search, $options: "i" } },
            { vehicleNumbers: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    pipeline.push({ $skip: skip }, { $limit: limit });

    const [rows, countResult] = await Promise.all([
      RTOApiLog.aggregate(pipeline),
      RTOApiLog.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      users: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────
   GET /api/user/analytics/rto-user/:userId
   Full per-vehicle RTO API call history for one user.
───────────────────────────────────────────────────────── */
exports.getAnalyticsRtoUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let matchQuery = { userId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchQuery.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const [user, hits] = await Promise.all([
      User.findById(userId)
        .select("basic_details.first_name basic_details.last_name basic_details.phone_number basic_details.email basic_details.profile_pic public_details.nick_name public_details.public_pic account_status blocked_reason blocked_at")
        .lean(),
      RTOApiLog.find(matchQuery)
        .sort({ createdAt: -1 })
        .select("vehicleNumber apiType trigger createdAt")
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
      hits,
      totalHits: hits.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────
   POST /api/user/admin/block-user
   Permanently blocks a user — no OTP, no login, no API access.
───────────────────────────────────────────────────────── */
exports.blockUserByAdmin = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.account_status === "BLOCKED") {
      return res.status(400).json({ success: false, message: "User is already blocked" });
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          is_active: false,
          account_status: "BLOCKED",
          blocked_reason: reason || "Blocked by admin",
          blocked_at: new Date(),
          is_logged_in: false,
        },
      }
    );

    // Send email notification to user if they have an email address
    if (user.basic_details && user.basic_details.email) {
      const email = user.basic_details.email;
      const blockReason = reason || "Blocked by admin";
      const name = `${user.basic_details.first_name || ""} ${user.basic_details.last_name || ""}`.trim() || "User";
      const phone = user.basic_details.phone_number || "N/A";

      try {
        const mailOptions = getMailOptions("account_blocked", email, { reason: blockReason, name, phone });
        await sendGraphEmail(mailOptions);
        console.log(`[Admin Block] Email sent to ${email}`);
      } catch (emailError) {
        console.error(`[Admin Block] Failed to send email to ${email}:`, emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "User has been permanently blocked",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────
   POST /api/user/admin/unblock-user
   Unblocks a previously blocked user.
───────────────────────────────────────────────────────── */
exports.unblockUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.account_status !== "BLOCKED") {
      return res.status(400).json({ success: false, message: "User is not blocked" });
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          is_active: true,
          account_status: "ACTIVE",
          blocked_reason: "",
          blocked_at: null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "User has been unblocked successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────
   DELETE /api/user/admin/delete-user/:userId
   Deletes a user permanently (Soft Delete).
───────────────────────────────────────────────────────── */
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.account_status === "DELETED") {
      return res.status(400).json({ success: false, message: "User is already deleted" });
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          is_active: false,
          account_status: "DELETED",
          deleted_reason: reason || "Deleted by admin",
          deleted_at: new Date(),
          is_logged_in: false,
        },
      }
    );

    // Send email notification to user if they have an email address
    if (user.basic_details && user.basic_details.email) {
      const email = user.basic_details.email;
      const deleteReason = reason || "Account deleted by admin";
      const name = `${user.basic_details.first_name || ""} ${user.basic_details.last_name || ""}`.trim() || "User";
      const phone = user.basic_details.phone_number || "N/A";

      try {
        const mailOptions = getMailOptions("account_deleted", email, { reason: deleteReason, name, phone });
        await sendGraphEmail(mailOptions);
        console.log(`[Admin Delete] Email sent to ${email}`);
      } catch (emailError) {
        console.error(`[Admin Delete] Failed to send email to ${email}:`, emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "User has been deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


