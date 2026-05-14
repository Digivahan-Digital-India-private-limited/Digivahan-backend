const express = require("express");
const router = express.Router();

const {
  createRazorpayOrder,
} = require("../controllers/razorpay.controller");
const { commonValidations, handleValidationErrors } = require("../middleware/validation");
const { API_ROUTES } = require("../../constants");

// 💳 CREATE RAZORPAY ORDER
router.post("/api/v1/razorpay/order", createRazorpayOrder);

module.exports = router;
