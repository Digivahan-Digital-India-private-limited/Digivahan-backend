const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const {
  GenerateOrderByUser,
  ConfirmOrderByAdmin,
  GenerateOrderManifest,
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
  [commonValidations.userId("user_id"), handleValidationErrors],
  GenerateOrderByUser,
);

router.post(
  API_ROUTES.ORDER.ADMIN_CONFIRM_ORDER,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  ConfirmOrderByAdmin,
);

router.get(
  API_ROUTES.ORDER.ADMIN_GENERATE_MANIFEST,
  [handleValidationErrors],
  GenerateOrderManifest,
);

router.get(
  API_ROUTES.ORDER.ADMIN_GENERATE_SHIPROCKET_LABEL,
  [handleValidationErrors],
  GenerateShiprocketLabel,
);

router.get(
  API_ROUTES.ORDER.ADMIN_GENERATE_DELIVERY_LABEL,
  [handleValidationErrors],
  GenerateDeliveryLabel,
);

router.post(
  API_ROUTES.ORDER.USER_ORDERS,
  [commonValidations.userId("user_id"), handleValidationErrors],
  getUserAllOrder,
);

router.post(
  API_ROUTES.ORDER.USER_ORDER_DETAILS,
  [
    commonValidations.userId("user_id"),
    commonValidations.orderId("order_id"),
    handleValidationErrors,
  ],
  findSingleOrderData,
);

router.post(
  API_ROUTES.ORDER.CHECK_COURIER_SERVICE,
  [
    commonValidations.validateDeliveryPostcode("delivery_postcode"),
    handleValidationErrors,
  ],
  CheckCourierService,
);

router.get(
  API_ROUTES.ORDER.GET_ALL_NEW_ORDER_BYADMIN,
  handleValidationErrors,
  GetAllNewOrderListToAdmin,
);

router.post(
  API_ROUTES.ORDER.FETCH_BY_ORDER_ID,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  findOrderByAdminThrowOrderId,
);

router.post(
  API_ROUTES.ORDER.FETCH_BY_USER_ID,
  [commonValidations.userId("user_id"), handleValidationErrors],
  findOrderByAdminThrowUserId,
);

router.post(
  API_ROUTES.ORDER.CANCEL_ORDER_BY_USER,
  [
    commonValidations.orderId("order_id"),
    commonValidations.userId("user_id"),
    handleValidationErrors,
  ],
  OrderCancelByUser,
);

router.post(
  API_ROUTES.ORDER.CANCEL_ORDER_BY_ADMIN,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  OrderCancelByAdmin,
);

router.post(
  API_ROUTES.ORDER.TRACK_ORDER_STATUS,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  TrackOrderwithOrderId,
);

router.post(
  API_ROUTES.ORDER.ADD_ACTIVE_PARTNER,
  [handleValidationErrors],
  AddNewActivePatner,
);

module.exports = router;
