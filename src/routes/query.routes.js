const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
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
} = require("../controllers/queryController.js");

router.post(API_ROUTES.QUERY.RAISE_QUERY, authenticateToken, handleValidationErrors, submitQuery);

router.get(API_ROUTES.QUERY.GET_QUERY, authenticateTokenForAdmin, handleValidationErrors, getAllQuery);

router.post("/admin/query/reply", authenticateTokenForAdmin, upload.single("attachment"), replyToQuery);

module.exports = router;
