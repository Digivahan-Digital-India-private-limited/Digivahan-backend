const express = require("express");
const router = express.Router();

const { 
  challanWebHook, 
  getAllChallanWebhooks,
  deleteChallanWebhook,
  bulkDeleteChallanWebhooks,
  deleteAllChallanWebhooks,
  getReceiptPresignedUrl,
} = require("../controllers/challanWebhook.controller");

// POST /api/challan-webhook
// Public webhook endpoint — no auth middleware (called by external payment provider)
router.post("/challan-webhook", challanWebHook);

// GET /api/challan-webhook/all
// Returns all challan webhook records
router.get("/challan-webhook/all", getAllChallanWebhooks);

// DELETE /api/challan-webhook/:id
// Delete a single record
router.delete("/challan-webhook/:id", deleteChallanWebhook);

// POST /api/challan-webhook/bulk-delete
// Delete multiple records (passing array of IDs in body)
router.post("/challan-webhook/bulk-delete", bulkDeleteChallanWebhooks);

// DELETE /api/challan-webhook/delete-all
// Delete all records
router.delete("/challan-webhook/delete-all", deleteAllChallanWebhooks);

// POST /api/challan-webhook/receipt-url
// Get a pre-signed URL for a challan receipt PDF (proxies to Invincible Ocean)
router.post("/challan-webhook/receipt-url", getReceiptPresignedUrl);

module.exports = router;
