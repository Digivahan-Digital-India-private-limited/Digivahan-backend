const express = require("express");
const router = express.Router();

const { API_ROUTES } = require("../../constants/apiRoutes.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const {
  sendNotification,
  sendNotificationForCall,
  getAllNotification,
  checkSecurityCode,
  verifySecurityCode,
  seenNotificationByUser,
  isOnnotification,
} = require("../controllers/notificationController.js");

router.post(
  API_ROUTES.NOTIFICATION.SEND,
  [commonValidations.receiverId("receiver_id"), handleValidationErrors],
  sendNotification
);

router.post(
  API_ROUTES.NOTIFICATION.SEND_NOTIFICATION_FOR_CALL,
  [
    commonValidations.senderId("sender_id"),
    commonValidations.receiverId("receiver_id"),
    handleValidationErrors,
  ],
  sendNotificationForCall
);

router.get(
  API_ROUTES.NOTIFICATION.GET_USER_NOTIFICATIONS,
  [handleValidationErrors],
  getAllNotification
);

router.post(
  API_ROUTES.NOTIFICATION.SEEN_NOTIFICATION,
  [commonValidations.userId("user_id"), handleValidationErrors],
  seenNotificationByUser
);

router.post(
  API_ROUTES.NOTIFICATION.CHECK_SECURITY_CODE,
  [
    commonValidations.userId("user_id"),
    commonValidations.vehicleIdRequired("vehicle_id"),
    handleValidationErrors,
  ],
  checkSecurityCode
);

router.post(
  API_ROUTES.NOTIFICATION.VERIFY_SECURITY_CODE,
  [
    commonValidations.userId("user_id"),
    commonValidations.vehicleIdRequired("vehicle_id"),
    handleValidationErrors,
  ],
  verifySecurityCode
);

router.post(
  API_ROUTES.NOTIFICATION.IS_ON_NOTIFICATION,
  [commonValidations.userId("user_id"), handleValidationErrors],
  isOnnotification
);

module.exports = router;
