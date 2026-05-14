const express = require("express");
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
  [handleValidationErrors],
  CompareVehicle
);

router.post(
  API_ROUTES.VEHICLE_COMPARISON_UPDATE.UPDATE,
  [handleValidationErrors],
  CompareVehicleUpdate
);

router.get(
  API_ROUTES.VEHICLE_COMPARISON_UPDATE.GET_COMPARISON,
  [handleValidationErrors],
  getAllvehicleCompairesionList
);

module.exports = router;
