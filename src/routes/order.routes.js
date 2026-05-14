const express = require("express");
const router = express.Router();
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const {
  GenerateOrderByUser,
  ConfirmOrderByAdmin,
  GenerateOrderManifest,
  PrintBulkManifest,
  GenerateShiprocketLabel,
  GenerateDeliveryLabel,
  getUserAllOrder,
  findSingleOrderData,
  GetAllNewOrderListToAdmin,
  findOrderByAdminThrowOrderId,
  findOrderByAdminThrowUserId,
  TrackOrderwithOrderId,
  OrderCancelByAdmin,
  OrderCancelByUser,
  CheckCourierService,
  AddNewActivePatner,
} = require("../controllers/OrderController.js");

router.post(
  API_ROUTES.ORDER.USER_CREATE_ORDER,
  authenticateToken,
  [commonValidations.userId("user_id"), handleValidationErrors],
  GenerateOrderByUser,
);

router.post(
  API_ROUTES.ORDER.ADMIN_CONFIRM_ORDER,
  authenticateTokenForAdmin,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  ConfirmOrderByAdmin,
);

router.post(
  API_ROUTES.ORDER.ADMIN_PRINT_MANIFEST_INBULK,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  PrintBulkManifest,
);

router.get(
  API_ROUTES.ORDER.ADMIN_GENERATE_MANIFEST,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  GenerateOrderManifest,
);

router.get(
  API_ROUTES.ORDER.ADMIN_GENERATE_SHIPROCKET_LABEL,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  GenerateShiprocketLabel,
);

router.get(
  API_ROUTES.ORDER.ADMIN_GENERATE_DELIVERY_LABEL,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  GenerateDeliveryLabel,
);

router.post(
  API_ROUTES.ORDER.USER_ORDERS,
  authenticateToken,
  [commonValidations.userId("user_id"), handleValidationErrors],
  getUserAllOrder,
);

router.post(
  API_ROUTES.ORDER.USER_ORDER_DETAILS,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.orderId("order_id"),
    handleValidationErrors,
  ],
  findSingleOrderData,
);

router.post(
  API_ROUTES.ORDER.CHECK_COURIER_SERVICE,
  authenticateToken,
  [
    commonValidations.validateDeliveryPostcode("delivery_postcode"),
    handleValidationErrors,
  ],
  CheckCourierService,
);

router.get(
  API_ROUTES.ORDER.GET_ALL_NEW_ORDER_BYADMIN,
  authenticateTokenForAdmin,
  handleValidationErrors,
  GetAllNewOrderListToAdmin,
);

router.post(
  API_ROUTES.ORDER.FETCH_BY_ORDER_ID,
  authenticateTokenForAdmin,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  findOrderByAdminThrowOrderId,
);

router.post(
  API_ROUTES.ORDER.FETCH_BY_USER_ID,
  authenticateTokenForAdmin,
  [commonValidations.userId("user_id"), handleValidationErrors],
  findOrderByAdminThrowUserId,
);

router.post(
  API_ROUTES.ORDER.CANCEL_ORDER_BY_USER,
  authenticateToken,
  [
    commonValidations.orderId("order_id"),
    commonValidations.userId("user_id"),
    handleValidationErrors,
  ],
  OrderCancelByUser,
);

router.post(
  API_ROUTES.ORDER.CANCEL_ORDER_BY_ADMIN,
  authenticateTokenForAdmin,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  OrderCancelByAdmin,
);

router.post(
  API_ROUTES.ORDER.TRACK_ORDER_STATUS,
  authenticateToken,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  TrackOrderwithOrderId,
);

router.post(
  API_ROUTES.ORDER.ADD_ACTIVE_PARTNER,
  authenticateTokenForAdmin,
  [handleValidationErrors],
  AddNewActivePatner,
);

module.exports = router;
