const ChallanWebhook = require("../models/ChallanWebhook");

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
 * Returns all challan webhook records from DB, sorted by latest first.
 */
const getAllChallanWebhooks = async (req, res) => {
  try {
    const records = await ChallanWebhook.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
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
