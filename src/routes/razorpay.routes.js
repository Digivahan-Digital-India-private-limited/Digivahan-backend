const express = require("express");
const router = express.Router();

const {
  createRazorpayOrder,
} = require("../controllers/razorpay.controller");
const { commonValidations, handleValidationErrors } = require("../middleware/validation");
const { API_ROUTES } = require("../../constants");

// 💳 CREATE RAZORPAY ORDER
// router.post("/api/v1/razorpay/order", createRazorpayOrder); (pritam route)


router.post(
  API_ROUTES.RAZORPAY.CREATE_ORDER, 
  [
    commonValidations.razorpayAmount(),
    commonValidations.razorpayUserId(),
    commonValidations.razorpayPurpose(),
  ],
  handleValidationErrors,
  createRazorpayOrder
);

module.exports = router;
