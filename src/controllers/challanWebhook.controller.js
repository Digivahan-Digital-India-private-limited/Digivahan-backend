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

module.exports = {
  challanWebHook,
  getAllChallanWebhooks,
};
