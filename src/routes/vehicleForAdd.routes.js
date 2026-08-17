const express = require("express");
const router = express.Router();
const { authenticateTokenForAdmin } = require("../middleware/auth.js");

const {
  adminGetVehiclesForAdd,
  adminGetSuccessVehicles,
  adminGetApiStats,
  adminMarkDownloaded,
  adminDeleteVehiclesForAdd,
  adminAddToUserGarage,
} = require("../controllers/vehicleForAddController.js");

// ── Admin Vehicle For Add Routes ──────────────────────────────────────────

// List fail vehicles (VehicleForAdd collection)
router.get("/admin/list", authenticateTokenForAdmin, adminGetVehiclesForAdd);

// List success vehicles (RTOApiLog success=true)
router.get("/admin/success-list", authenticateTokenForAdmin, adminGetSuccessVehicles);

// Overall API stats for pie chart
router.get("/admin/stats", authenticateTokenForAdmin, adminGetApiStats);

// Mark selected vehicles as downloaded
router.post("/admin/mark-downloaded", authenticateTokenForAdmin, adminMarkDownloaded);

// Delete selected vehicles from the list
router.delete("/admin/delete", authenticateTokenForAdmin, adminDeleteVehiclesForAdd);

// Add vehicle directly to user's garage
router.post("/admin/add-to-user-garage", authenticateTokenForAdmin, adminAddToUserGarage);

module.exports = router;
