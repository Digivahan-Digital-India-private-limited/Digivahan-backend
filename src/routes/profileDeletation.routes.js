const express = require("express");
const router = express.Router();
const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  DeleteByUser,
} = require("../controllers/profileDeletationController.js");

const { authenticateToken } = require("../middleware/auth.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

router.post(
  API_ROUTES.USER.PROCESS_DELETIONS,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.deletionReason("reason"),
    handleValidationErrors,
  ],
  DeleteByUser
);


module.exports = router;
