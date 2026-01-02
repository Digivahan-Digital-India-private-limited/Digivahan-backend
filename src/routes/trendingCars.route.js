const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  addTrendingCar,
  fetchcardDetails,
  getCarDetails,
  DeleteCarDetails
} = require("../controllers/trendingCarsController.js");

router.post(
  API_ROUTES.TRENDING_CARS.ADD_TRENDING_CAR,
  [handleValidationErrors],
  addTrendingCar
);

router.get(
  API_ROUTES.TRENDING_CARS.GET_CAR_LIST,
  handleValidationErrors,
  fetchcardDetails
);

router.get(
  API_ROUTES.TRENDING_CARS.GET_BY_ID,
  handleValidationErrors,
  getCarDetails
);

router.delete(
    API_ROUTES.TRENDING_CARS.DELETE_CAR_DETAILS,
    handleValidationErrors,
    DeleteCarDetails
)

module.exports = router;
