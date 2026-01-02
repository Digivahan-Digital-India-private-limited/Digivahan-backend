const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  createQrScanner,
  getQrDetails,
  AssignedQrtoUser,
  CheckQrInUser,
  QrCustomTemplateUrl,
  getUploadedTemplateImage,
} = require("../controllers/QrController.js");

router.post(
  API_ROUTES.QR.GENERATE_QR,
  [commonValidations.unitno("unit"), handleValidationErrors],
  createQrScanner
);

router.get(API_ROUTES.QR.QR_DETAILS, [handleValidationErrors], getQrDetails);

router.post(
  API_ROUTES.QR.QR_ASSIGNMENT,
  [handleValidationErrors],
  AssignedQrtoUser
);

router.post(
  API_ROUTES.QR.CHECK_QR,
  [commonValidations.userId("user_id"), handleValidationErrors],
  CheckQrInUser
);

router.get(
  API_ROUTES.QR.GET_QR_TEMPLATES,
  [handleValidationErrors],
  QrCustomTemplateUrl
);

router.get(
  API_ROUTES.QR.UPLODED_TEMPLATE,
  [handleValidationErrors],
  getUploadedTemplateImage
);

module.exports = router;
