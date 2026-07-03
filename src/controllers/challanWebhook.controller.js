const ChallanWebhook = require("../models/ChallanWebhook");
const User = require("../models/User");
const { sendGraphEmail } = require("../utils/sendEmail");

// Admin emails jo challan Under Process hone pe notification paayenge
const CHALLAN_NOTIFICATION_EMAILS = [
  "Mustafahasan555@gmail.com",
  "Sandeep.Rathor@digivahan.in",
  "pinkusharma9697@gmail.com",
  "hasansaifkhan0@gmail.com",
];

/**
 * Challan Under Process hone pe sabhi 4 admin emails pe notification bhejta hai
 */
const sendChallanUnderProcessNotification = async (webhookData) => {
  try {
    const paymentDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // RC number ke basis pe user ka phone number nikalna
    let userPhone = "N/A";
    if (webhookData.rcNumber) {
      // 1. Check ChallanWebhook for a record with this rcNumber and a userId (e.g. SEARCHED records)
      const searchRecord = await ChallanWebhook.findOne({
        rcNumber: webhookData.rcNumber,
        userId: { $exists: true, $ne: null }
      }).populate("userId", "basic_details.phone_number").sort({ createdAt: -1 }).lean();

      if (searchRecord && searchRecord.userId && searchRecord.userId.basic_details && searchRecord.userId.basic_details.phone_number) {
        userPhone = searchRecord.userId.basic_details.phone_number;
      } else {
        // 2. Fallback to RTOApiLog
        const RTOApiLog = require("../models/RTOApiLog");
        const logRecord = await RTOApiLog.findOne({
          vehicleNumber: webhookData.rcNumber,
          userId: { $exists: true, $ne: null }
        }).populate("userId", "basic_details.phone_number").sort({ createdAt: -1 }).lean();

        if (logRecord && logRecord.userId && logRecord.userId.basic_details && logRecord.userId.basic_details.phone_number) {
          userPhone = logRecord.userId.basic_details.phone_number;
        }
      }
    }

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 30px auto; padding: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.12); border: 1px solid #e0e0e0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">⏳ Challan Payment Under Process</h1>
          <p style="color: #fef3c7; margin: 8px 0 0; font-size: 14px;">DigiVahan Challan Notification</p>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 30px 32px;">

          <!-- Status Badge -->
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid #fcd34d;">🔄 UNDER PROCESS</span>
          </div>

          <!-- Challan Info -->
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.8px;">Challan Details</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Challan Number:</strong> ${webhookData.challanNumber || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>RC Number:</strong> ${webhookData.rcNumber || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Mobile Number:</strong> ${userPhone}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Request ID:</strong> ${webhookData.requestId || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Date & Time:</strong> ${paymentDate}</p>
          </div>

          <!-- Payment Info -->
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.8px;">Payment Details</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Transaction Status:</strong> ${webhookData.transactionStatus || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Amount:</strong> ₹${webhookData.amountSettledAt || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Convenience Fee:</strong> ₹${webhookData.convenienceFee || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Payment Gateway Fee:</strong> ₹${webhookData.paymentGatewayFee || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>Receipt Number:</strong> ${webhookData.receiptNumber || "N/A"}</p>
            <p style="margin: 4px 0; font-size: 15px; color: #222;"><strong>IO Status:</strong> ${webhookData.ioStatus || "N/A"}</p>
          </div>

          ${webhookData.comment ? `<div style="background: #f8f9fa; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 14px; color: #555;"><strong>Comment:</strong> ${webhookData.comment}</div>` : ""}

          <p style="font-size: 14px; color: #888; text-align: center;">Yeh challan payment abhi process ho rahi hai. Admin panel me check karein aur status monitor karein.</p>
        </div>

        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 18px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.</p>
        </div>
      </div>
    `;

    const emailPromises = CHALLAN_NOTIFICATION_EMAILS.map((emailAddress) =>
      sendGraphEmail({
        to: emailAddress,
        subject: `⏳ Challan Under Process - RC: ${webhookData.rcNumber || "N/A"} | Challan: ${webhookData.challanNumber || "N/A"}`,
        html: emailHtml,
      }).catch((err) =>
        console.error(`[ChallanNotification] Failed to send email to ${emailAddress}:`, err.message)
      )
    );

    await Promise.all(emailPromises);
    console.log(`[ChallanNotification] Under Process emails sent for challan: ${webhookData.challanNumber}`);
  } catch (err) {
    console.error("[ChallanNotification] Error sending Under Process notification:", err.message);
  }
};

/**
 * POST /api/challan-webhook
 * Receives challan webhook data from external payment provider.
 * - If record does not exist → creates new record
 * - If record exists (matched by rcNumber + challanNumber + requestId) → updates it
 */
const challanWebHook = async (req, res) => {
  const body = req.body;

  try {
    // Check if a record already exists with same identifiers
    const existingRecord = await ChallanWebhook.findOne({
      rcNumber: body?.rcNumber,
      challanNumber: body?.challanNumber,
      requestId: body?.requestId,
    });

    if (!existingRecord) {
      console.log("---- [ChallanWebhook] Inserting New Record ----");

      const newRecord = await ChallanWebhook.create(body);

      console.log("[ChallanWebhook] Success: New record saved");

      // Agar payment captured hai (Under Process) to email notification bhejo
      if (body?.transactionStatus?.toLowerCase() === "captured") {
        sendChallanUnderProcessNotification(body).catch((err) =>
          console.error("[ChallanNotification] Unhandled error:", err.message)
        );
      }

      return res.status(200).json({
        success: true,
        message: "Webhook data inserted successfully",
      });
    } else {
      console.log("---- [ChallanWebhook] Updating Existing Record ----");

      await ChallanWebhook.updateOne(
        {
          rcNumber: body?.rcNumber,
          challanNumber: body?.challanNumber,
          requestId: body?.requestId,
        },
        {
          $set: body,
        }
      );

      console.log("[ChallanWebhook] Success: Record updated");

      // Agar updated record captured hai (Under Process) to email notification bhejo
      if (body?.transactionStatus?.toLowerCase() === "captured") {
        sendChallanUnderProcessNotification(body).catch((err) =>
          console.error("[ChallanNotification] Unhandled error:", err.message)
        );
      }

      return res.status(200).json({
        success: true,
        message: "Webhook data updated successfully",
      });
    }
  } catch (error) {
    console.error("[ChallanWebhook] Error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
    });
  }
};

/**
 * GET /api/challan-webhook/all
 * Returns all challan webhook records, enriched with user phone numbers.
 * - Records with userId → populate phone from User model
 * - External webhook records (no userId) → match by rcNumber from SEARCHED records
 */
const getAllChallanWebhooks = async (req, res) => {
  try {
    const RTOApiLog = require("../models/RTOApiLog");

    // Fetch all records with userId populated (phone number)
    const records = await ChallanWebhook.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "basic_details.phone_number basic_details.first_name");

    // Build a map of rcNumber → phone from records that DO have a userId (SEARCHED records)
    const rcToPhone = {};
    for (const rec of records) {
      if (rec.userId && rec.rcNumber) {
        const phone = rec.userId?.basic_details?.phone_number;
        if (phone) rcToPhone[rec.rcNumber] = phone;
      }
    }

    // Identify rcNumbers that are still missing phone mapping
    const missingRcNumbers = records
      .filter((rec) => !rec.userId && rec.rcNumber && !rcToPhone[rec.rcNumber])
      .map((rec) => rec.rcNumber);

    if (missingRcNumbers.length > 0) {
      // Find logs for these missing RC numbers
      const logs = await RTOApiLog.find({
        vehicleNumber: { $in: missingRcNumbers },
        userId: { $ne: null }
      }).sort({ createdAt: -1 }).lean();

      const rcToUserId = {};
      const userIdsToFetch = new Set();

      // Since it's sorted by latest, the first match per RC is the most recent user
      for (const log of logs) {
        if (!rcToUserId[log.vehicleNumber]) {
          rcToUserId[log.vehicleNumber] = log.userId;
          userIdsToFetch.add(log.userId.toString());
        }
      }

      if (userIdsToFetch.size > 0) {
        const users = await User.find({ _id: { $in: Array.from(userIdsToFetch) } })
          .select("basic_details.phone_number");
        const userIdToPhone = {};
        for (const user of users) {
          userIdToPhone[user._id.toString()] = user.basic_details?.phone_number;
        }

        // Add them to rcToPhone
        for (const rc of missingRcNumbers) {
          if (rcToUserId[rc]) {
            const phone = userIdToPhone[rcToUserId[rc].toString()];
            if (phone) rcToPhone[rc] = phone;
          }
        }
      }
    }

    // Enrich records that are external webhooks (no userId) using the rcToPhone map
    const enriched = records.map((rec) => {
      const obj = rec.toObject();
      // If userId is populated, extract phone directly
      if (obj.userId && obj.userId.basic_details) {
        obj.userPhone = obj.userId.basic_details.phone_number || null;
        obj.userId = obj.userId._id; // collapse back to ID for clean response
      } else {
        // Try to find phone by rcNumber from our mapped records (SEARCHED or RTOApiLog)
        obj.userPhone = obj.rcNumber ? (rcToPhone[obj.rcNumber] || null) : null;
      }

      // Specifically remove userPhone for these two challans as per request
      if (obj.challanNumber === 'TN14040240424105603' || obj.challanNumber === 'TN14184260224191310') {
        obj.userPhone = null;
      }

      return obj;
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error("[ChallanWebhook] GET Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch challan webhook data",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/challan-webhook/:id
 * Delete a single webhook record by ID
 */
const deleteChallanWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ChallanWebhook.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("[ChallanWebhook] Delete Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete record",
      error: error.message,
    });
  }
};

/**
 * POST /api/challan-webhook/bulk-delete
 * Delete multiple records by an array of IDs
 */
const bulkDeleteChallanWebhooks = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IDs provided",
      });
    }

    const result = await ChallanWebhook.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} records deleted successfully`,
    });
  } catch (error) {
    console.error("[ChallanWebhook] Bulk Delete Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete records",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/challan-webhook/delete-all
 * Delete all records (Admin only)
 */
const deleteAllChallanWebhooks = async (req, res) => {
  try {
    const result = await ChallanWebhook.deleteMany({});

    return res.status(200).json({
      success: true,
      message: `All records (${result.deletedCount}) deleted successfully`,
    });
  } catch (error) {
    console.error("[ChallanWebhook] Delete All Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete all records",
      error: error.message,
    });
  }
};

module.exports = {
  challanWebHook,
  getAllChallanWebhooks,
  deleteChallanWebhook,
  bulkDeleteChallanWebhooks,
  deleteAllChallanWebhooks,
};
