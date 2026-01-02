const express = require("express");
const router = express.Router();

const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { API_ROUTES } = require("../../constants/apiRoutes.js");
const {
  GenerateOrder,
  getUserAllOrder,
  findSingleOrderData,
  checkCouierService,
  findOrderByOrderId,
  findOrderByUserId,
  TrackOrderwithOrderId,
  OrderCancel
} = require("../controllers/OrderController.js");

router.post(
  API_ROUTES.ORDER.CREATE_ORDER,
  [commonValidations.userId("user_id"), handleValidationErrors],
  GenerateOrder
);

router.post(
  API_ROUTES.ORDER.USER_ORDERS,
  [commonValidations.userId("user_id"), handleValidationErrors],
  getUserAllOrder
);

router.post(
  API_ROUTES.ORDER.USER_ORDER_DETAILS,
  [
    commonValidations.userId("user_id"),
    commonValidations.orderId("order_id"),
    handleValidationErrors,
  ],
  findSingleOrderData
);

router.post(
  API_ROUTES.ORDER.CHECK_COURIER,
  [
    commonValidations.validateDeliveryPostcode("delivery_postcode"),
    handleValidationErrors,
  ],
  checkCouierService
);

router.post(
  API_ROUTES.ORDER.FETCH_BY_ORDER_ID,
  [commonValidations.orderId("order_id"), handleValidationErrors],
  findOrderByOrderId
);

router.post(
  API_ROUTES.ORDER.FETCH_BY_USER_ID,
  [commonValidations.userId("user_id"), handleValidationErrors],
  findOrderByUserId
);

router.post(
  API_ROUTES.ORDER.CANCEL_ORDER,
  [
    commonValidations.userId("user_id"),
    handleValidationErrors
  ], 
  OrderCancel
)

router.post(
  API_ROUTES.ORDER.TRACK_ORDER_STATUS,
  [commonValidations.userId("user_id"), handleValidationErrors],
  TrackOrderwithOrderId
);

module.exports = router;
