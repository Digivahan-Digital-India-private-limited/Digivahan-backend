const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
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
} = require("../controllers/garageController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

// Add Vehicle to Garage - Fetch vehicle data from RTO and save to user's garage
router.post(
  API_ROUTES.GARAGE.ADD_VEHICLE,
  authenticateToken,
  [handleValidationErrors],
  addVehicle,
);

router.post(
  API_ROUTES.GARAGE.ADD_USER_GARAGE,
  authenticateToken,
  [commonValidations.userId("user_id"), handleValidationErrors],
  addVehicleInUsergarage,
);

router.post(
  API_ROUTES.GARAGE.REFRESH_VEHICLE_DATA,
  authenticateToken,
  [handleValidationErrors],
  RefreshVehicleData,
);

// Get User's Garage - Get all vehicles in user's garage
router.get(
  API_ROUTES.GARAGE.GET_GARAGE,
  authenticateToken,
  [commonValidations.userIdParam("user_id"), handleValidationErrors],
  getGarage,
);

// Remove Vehicle from Garage - Remove a vehicle from user's garage
router.post(
  API_ROUTES.GARAGE.REMOVE_VEHICLE,
  authenticateToken,
  [commonValidations.userId("user_id"), handleValidationErrors],
  removeVehicle,
);

router.post(
  API_ROUTES.GARAGE.CHECK_SECURITY_CODE,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.vehicleIdRequired("vehicle_id"),
    handleValidationErrors,
  ],
  checkSecurityCode,
);

router.post(
  API_ROUTES.GARAGE.VERIFY_SECURITY_CODE,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.vehicleIdRequired("vehicle_id"),
    handleValidationErrors,
  ],
  verifySecurityCode,
);

module.exports = router;
