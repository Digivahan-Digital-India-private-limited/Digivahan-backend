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
} = require("../controllers/garageController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const { optionalAuthToken } = require("../middleware/auth.js");

// Add Vehicle to Garage - Fetch vehicle data from RTO and save to user's garage
// ✅ optionalAuthToken: logged-in user ka userId track hoga (analytics), public access bhi kaam karega
router.post(
  API_ROUTES.GARAGE.ADD_VEHICLE,
  [optionalAuthToken, handleValidationErrors],
  addVehicle,
);

router.post(
  API_ROUTES.GARAGE.ADD_USER_GARAGE,
  [commonValidations.userId("user_id"), handleValidationErrors],
  addVehicleInUsergarage,
);

// ✅ optionalAuthToken: refresh karte waqt bhi userId track hoga
router.post(
  API_ROUTES.GARAGE.REFRESH_VEHICLE_DATA,
  [optionalAuthToken, handleValidationErrors],
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

module.exports = router;
