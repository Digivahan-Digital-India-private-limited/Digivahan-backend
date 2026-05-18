const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const { upload } = require("../middleware/cloudinary.js");

const {
  submitQuery,
  getAllQuery,
  replyToQuery,
  deleteQuery,
  deleteMultipleQueries,
} = require("../controllers/queryController.js");

router.post(API_ROUTES.QUERY.RAISE_QUERY, handleValidationErrors, submitQuery);

router.get(API_ROUTES.QUERY.GET_QUERY, handleValidationErrors, getAllQuery);

router.delete(API_ROUTES.QUERY.DELETE_QUERY, handleValidationErrors, deleteQuery);

router.post(API_ROUTES.QUERY.DELETE_MULTIPLE_QUERIES, handleValidationErrors, deleteMultipleQueries);

router.post("/admin/query/reply", upload.single("attachment"), replyToQuery);

module.exports = router;
