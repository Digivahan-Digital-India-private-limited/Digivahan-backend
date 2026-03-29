const express = require("express");
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
  [handleValidationErrors],
  miniKycByAdmin,
);

router.get(
  API_ROUTES.BBPS.GET_CATEGORY,
  [handleValidationErrors],
  getbillcategoryByadmin,
);

router.post(
  API_ROUTES.BBPS.GET_BILLER_LIST,
  [handleValidationErrors],
  getBillerlistByUser,
);

router.get(
  API_ROUTES.BBPS.GET_BILLER_DETAILS,
  [handleValidationErrors],
  getBillerDetailsByUser,
);

router.post(
  API_ROUTES.BBPS.GET_BILLER_ENQUIRY,
  [handleValidationErrors],
  billerEnquiryByuser,
);

router.post(
  API_ROUTES.BBPS.VALIDATE_BILLER,
  [handleValidationErrors],
  validateBiller,
);

router.post(
  API_ROUTES.BBPS.PAYMENT_SERVICE,
  [handleValidationErrors],
  paymentsService,
);

router.get(
  API_ROUTES.BBPS.GET_PAYMENT_DETAILS,
  [handleValidationErrors],
  getPaymentDeatils,
);

module.exports = router;
