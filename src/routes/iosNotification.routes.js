const express = require("express");
const router = express.Router();

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  sendIosNotification,
} = require("../controllers/iosNotificationController.js");

// New route for iOS push notifications
router.post(
  API_ROUTES.IOS_NOTIFICATION.SEND,
  [commonValidations.receiverId("receiver_id"), handleValidationErrors],
  sendIosNotification,
);

module.exports = router;
