const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();
const {
  miniKycByAdmin,
  getbillcategoryByadmin,
  getBillerlistByUser,
  getBillerDetailsByUser,
  billerEnquiryByuser,
  validateBiller,
  paymentsService,
  getPaymentDeatils
} = require("../controllers/serviceController.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");

router.post(
  API_ROUTES.BBPS.GET_MINIKYC_DETAILS,
  authenticateToken,
  [handleValidationErrors],
  miniKycByAdmin,
);

router.get(
  API_ROUTES.BBPS.GET_CATEGORY,
  authenticateToken,
  [handleValidationErrors],
  getbillcategoryByadmin,
);

router.post(
  API_ROUTES.BBPS.GET_BILLER_LIST,
  authenticateToken,
  [handleValidationErrors],
  getBillerlistByUser,
);

router.get(
  API_ROUTES.BBPS.GET_BILLER_DETAILS,
  authenticateToken,
  [handleValidationErrors],
  getBillerDetailsByUser,
);

router.post(
  API_ROUTES.BBPS.GET_BILLER_ENQUIRY,
  authenticateToken,
  [handleValidationErrors],
  billerEnquiryByuser,
);

router.post(
  API_ROUTES.BBPS.VALIDATE_BILLER,
  authenticateToken,
  [handleValidationErrors],
  validateBiller,
);

router.post(
  API_ROUTES.BBPS.PAYMENT_SERVICE,
  authenticateToken,
  [handleValidationErrors],
  paymentsService,
);

router.get(
  API_ROUTES.BBPS.GET_PAYMENT_DETAILS,
  authenticateToken,
  [handleValidationErrors],
  getPaymentDeatils,
);

module.exports = router;
