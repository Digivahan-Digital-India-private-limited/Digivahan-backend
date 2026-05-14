const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  CompareVehicle,
  CompareVehicleUpdate,
  getAllvehicleCompairesionList
} = require("../controllers/vehicleComparisonController.js");

router.post(
  API_ROUTES.VEHICLE_COMPARISON_UPDATE.COMPARE,
  authenticateToken,
  [handleValidationErrors],
  CompareVehicle
);

router.post(
  API_ROUTES.VEHICLE_COMPARISON_UPDATE.UPDATE,
  authenticateToken,
  [handleValidationErrors],
  CompareVehicleUpdate
);

router.get(
  API_ROUTES.VEHICLE_COMPARISON_UPDATE.GET_COMPARISON,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  getAllvehicleCompairesionList
);

module.exports = router;
