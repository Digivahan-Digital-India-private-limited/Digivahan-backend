const express = require("express");
const router = express.Router();

const { challanWebHook, getAllChallanWebhooks } = require("../controllers/challanWebhook.controller");

// POST /api/challan-webhook
// Public webhook endpoint — no auth middleware (called by external payment provider)
router.post("/challan-webhook", challanWebHook);

// GET /api/challan-webhook/all
// Returns all challan webhook records
router.get("/challan-webhook/all", getAllChallanWebhooks);


module.exports = router;
