const express = require("express");
const router = express.Router();
const { authenticateTokenForAdmin } = require("../middleware/auth.js");

const {
  adminGetVehiclesForAdd,
  adminMarkDownloaded,
  adminDeleteVehiclesForAdd,
} = require("../controllers/vehicleForAddController.js");

// ── Admin Vehicle For Add Routes ──────────────────────────────────────────

// List vehicles for add
router.get("/admin/list", authenticateTokenForAdmin, adminGetVehiclesForAdd);

// Mark selected vehicles as downloaded
router.post("/admin/mark-downloaded", authenticateTokenForAdmin, adminMarkDownloaded);

// Delete selected vehicles from the list
router.delete("/admin/delete", authenticateTokenForAdmin, adminDeleteVehiclesForAdd);

module.exports = router;
