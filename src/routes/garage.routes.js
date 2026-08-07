const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  addVehicle,
  addVehicleInUsergarage,
  RefreshVehicleData,
  getGarage,
  removeVehicle,
  checkSecurityCode,
  verifySecurityCode,
  adminGetAllGarages,
  adminDeleteVehicleFromGarage,
  adminVehicleAutocomplete,
  adminDeleteChallanRecord,
} = require("../controllers/garageController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");

// Add Vehicle to Garage - Fetch vehicle data from RTO and save to user's garage
// ✅ authenticateToken: now requires login
router.post(
  API_ROUTES.GARAGE.ADD_VEHICLE,
  [authenticateToken, handleValidationErrors],
  addVehicle,
);

router.post(
  API_ROUTES.GARAGE.ADD_USER_GARAGE,
  [commonValidations.userId("user_id"), handleValidationErrors],
  addVehicleInUsergarage,
);

// ✅ authenticateToken: now requires login
router.post(
  API_ROUTES.GARAGE.REFRESH_VEHICLE_DATA,
  [authenticateToken, handleValidationErrors],
  RefreshVehicleData,
);

// Get User's Garage - Get all vehicles in user's garage
router.get(
  API_ROUTES.GARAGE.GET_GARAGE,
  [commonValidations.userIdParam("user_id"), handleValidationErrors],
  getGarage,
);

// Remove Vehicle from Garage - Remove a vehicle from user's garage
router.post(
  API_ROUTES.GARAGE.REMOVE_VEHICLE,
  [commonValidations.userId("user_id"), handleValidationErrors],
  removeVehicle,
);

router.post(
  API_ROUTES.GARAGE.CHECK_SECURITY_CODE,
  [
    commonValidations.userId("user_id"),
    commonValidations.vehicleIdRequired("vehicle_id"),
    handleValidationErrors,
  ],
  checkSecurityCode,
);

router.post(
  API_ROUTES.GARAGE.VERIFY_SECURITY_CODE,
  [
    commonValidations.userId("user_id"),
    commonValidations.vehicleIdRequired("vehicle_id"),
    handleValidationErrors,
  ],
  verifySecurityCode,
);

// ── Admin Garage Management Routes ──────────────────────────────────────────
// Autocomplete: GET /api/v1/garage/admin/autocomplete?q=UP54
router.get("/v1/garage/admin/autocomplete", authenticateTokenForAdmin, adminVehicleAutocomplete);

// List all vehicles (garage + challan): GET /api/v1/garage/admin/all-garages
router.get("/v1/garage/admin/all-garages", authenticateTokenForAdmin, adminGetAllGarages);

// Admin delete vehicle from garage: DELETE /api/v1/garage/admin/delete-vehicle
router.delete("/v1/garage/admin/delete-vehicle", authenticateTokenForAdmin, adminDeleteVehicleFromGarage);

// Admin delete challan search record: DELETE /api/v1/garage/admin/delete-challan-record
router.delete("/v1/garage/admin/delete-challan-record", authenticateTokenForAdmin, adminDeleteChallanRecord);

module.exports = router;
