const express = require("express");
const router = express.Router();
const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { authenticateTokenForAdmin } = require("../middleware/auth.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  SignInAdmin,
  verifyAdminOTP,
  LogoutAdmin,
} = require("../controllers/adminAuthController.js");

router.post(
  API_ROUTES.AUTH.ADMIN.SIGN_IN_ADMIN,
  [commonValidations.phone("phone"), handleValidationErrors],
  SignInAdmin,
);

router.post(
  API_ROUTES.AUTH.ADMIN.VERIFY_ADMIN,
  [handleValidationErrors],
  verifyAdminOTP,
);

router.post(
  API_ROUTES.AUTH.ADMIN.LOGOUT_ADMIN,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  LogoutAdmin,
);

module.exports = router;
