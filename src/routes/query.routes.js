const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  submitQuery,
  getAllQuery,
} = require("../controllers/queryController.js");

router.post(API_ROUTES.QUERY.RAISE_QUERY, handleValidationErrors, submitQuery);

router.get(API_ROUTES.QUERY.GET_QUERY, handleValidationErrors, getAllQuery);

module.exports = router;
