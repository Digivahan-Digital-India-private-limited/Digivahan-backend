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
} = require("../controllers/garageController.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

// Add Vehicle to Garage - Fetch vehicle data from RTO and save to user's garage
router.post(
  API_ROUTES.GARAGE.ADD_VEHICLE,
  [handleValidationErrors],
  addVehicle
);

router.post(
  API_ROUTES.GARAGE.ADD_USER_GARAGE,
  [commonValidations.userId("user_id"), handleValidationErrors],
  addVehicleInUsergarage
);

router.post(
  API_ROUTES.GARAGE.REFRESH_VEHICLE_DATA,
  [commonValidations.userId("user_id"), handleValidationErrors],
  RefreshVehicleData
);

// Get User's Garage - Get all vehicles in user's garage
router.get(
  API_ROUTES.GARAGE.GET_GARAGE,
  [commonValidations.userIdParam("user_id"), handleValidationErrors],
  getGarage
);

// Remove Vehicle from Garage - Remove a vehicle from user's garage
router.post(
  API_ROUTES.GARAGE.REMOVE_VEHICLE,
  [commonValidations.userId("user_id"), handleValidationErrors],
  removeVehicle
);

module.exports = router;
