const express = require("express");
const router = express.Router();
const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  contactToUser,
  sendSMSNotificationToUser,
} = require("../controllers/contactUserController.js");

router.post(
  API_ROUTES.CONTACT.CALL_USER,
  [handleValidationErrors],
  contactToUser,
);

router.post(
  API_ROUTES.CONTACT.SEND_SMS_NOTIFICATION,
  [handleValidationErrors],
  sendSMSNotificationToUser,
);

module.exports = router;
