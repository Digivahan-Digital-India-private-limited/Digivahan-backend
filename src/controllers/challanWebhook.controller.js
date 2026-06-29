const ChallanWebhook = require("../models/ChallanWebhook");
const User = require("../models/User");

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

      await ChallanWebhook.create(body);

      console.log("[ChallanWebhook] Success: New record saved");

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
