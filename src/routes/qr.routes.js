const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  createQrScanner,
  createQrWithQrId,
  getQrDetails,
  AssignedQrtoUser,
  CheckQrInUser,
  CreateQrTemplateInBulk,
  CreateSingleQRTemplate,
  getUploadedTemplateImage,
  GetUserdetailsThrowTheQRId,
  filterQrlist,
  QrBlockedByAdmin,
} = require("../controllers/QrController.js");

router.post(
  API_ROUTES.QR.GENERATE_QR,
  authenticateTokenForAdmin,
  [commonValidations.unitno("unit"), handleValidationErrors],
  createQrScanner,
);

router.post(
  API_ROUTES.QR.GENERATE_QR_WITH_ID,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  createQrWithQrId,
);

router.get(API_ROUTES.QR.QR_DETAILS, authenticateToken, [handleValidationErrors], getQrDetails);

router.post(
  API_ROUTES.QR.QR_ASSIGNMENT,
 authenticateTokenForAdmin,
  [handleValidationErrors],
  AssignedQrtoUser,
);

router.post(
  API_ROUTES.QR.CHECK_QR,
  authenticateToken,
  [commonValidations.userId("user_id"), handleValidationErrors],
  CheckQrInUser,
);

router.post(
  API_ROUTES.QR.GET_QR_TEMPLATES_BULK,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  CreateQrTemplateInBulk,
);

router.post(
  API_ROUTES.QR.GET_QR_TEMPLATE_USER,
  authenticateToken,
  [handleValidationErrors],
  CreateSingleQRTemplate,
);

router.get(
  API_ROUTES.QR.UPLODED_TEMPLATE,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  getUploadedTemplateImage,
);

router.get(
  API_ROUTES.QR.GET_USER_DETAILS,
  [handleValidationErrors],
  GetUserdetailsThrowTheQRId,
);

router.get(
  API_ROUTES.QR.ADMIN_FILTER_QR,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  filterQrlist,
);

router.post(
  API_ROUTES.QR.ADMIN_BLOCKED_QR,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  QrBlockedByAdmin,
);

module.exports = router;
