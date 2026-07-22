const express = require("express");
const router = express.Router();
const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { authenticateTokenForAdmin, authenticateTokenForMasterAdmin } = require("../middleware/auth.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  SignInAdmin,
  verifyAdminOTP,
  LogoutAdmin,
  MasterSignInAdmin,
  verifyMasterAdminOTP,
  listAdmins,
  addAdmin,
  deleteAdmin,
  getAdminPermissions,
  updateAdminPermissions,
  getMyPermissions,
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

router.post(
  "/admin/master/sign-in",
  [commonValidations.phone("phone"), handleValidationErrors],
  MasterSignInAdmin,
);

router.post(
  "/admin/master/verify",
  [handleValidationErrors],
  verifyMasterAdminOTP,
);

// ── Master Admin: Admin Management Routes ──
router.get("/admin/master/admins", /* authenticateTokenForMasterAdmin, */ listAdmins);
router.post("/admin/master/admins", /* authenticateTokenForMasterAdmin, */ addAdmin);
router.delete("/admin/master/admins/:id", /* authenticateTokenForMasterAdmin, */ deleteAdmin);

// ── Master Admin: Permissions Routes ──
router.get("/admin/master/permissions/:adminId", /* authenticateTokenForMasterAdmin, */ getAdminPermissions);
router.put("/admin/master/permissions/:adminId", /* authenticateTokenForMasterAdmin, */ updateAdminPermissions);

// ── Regular Admin: Get Own Permissions ──
router.get("/admin/my-permissions", authenticateTokenForAdmin, getMyPermissions);

module.exports = router;
