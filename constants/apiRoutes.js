/**
 * API Route Constants
 * Centralized definition of all API endpoints
 */

const API_ROUTES = {
  // Base routes
  BASE: "/",
  HEALTH: "/health",

  // Auth routes
  AUTH: {
    BASE: "/api/auth",

    // Check routes

    CHECK: {
      INIT: "/check/init",
    },

    // Registration routes
    REGISTER: {
      INIT: "/register/init",
      VERIFY_OTP: "/register/verify-otp",
      RESEND_OTP: "/register/resend-otp",
    },

    // Login routes
    LOGIN: {
      SIGN_IN: "/sign-in",
      OTP_BASED_LOGIN: "/otp-based-login",
      VERIFY_LOGIN_OTP: "/verify-login-otp",
    },

    LOGOUT: {
      USER_LOGOUT: "/logout-user",
    },

    // Password reset routes
    PASSWORD_RESET: {
      CHANGE_PASSWORD: "/change-password",
      VALIDATE_PASSWORD: "/check/new-password",
      REQUEST: "/request-reset-password",
      VERIFY_OTP: "/verify-reset-otp-change-password",
    },

    // User verification routes
    USER_VERIFY: {
      REQUEST: "/user/verify/request",
      CONFIRM: "/user/verify/confirm",
    },

    // User primary routes
    USER_PRIMARY: {
      REQUEST: "/user/change-primary-contact-request",
      CONFIRM: "/user/change-primary-contact-verification",
    },

    // User management routes
    USER_MANAGEMENT: {
      SUSPEND: "/suspend-user",
      REMOVE_SUSPENSION: "/remove-suspension",
    },

    ADMIN: {
      SIGN_IN_ADMIN: "/admin/send-otp",
      LOGOUT_ADMIN: "/admin/logout-admin",
      VERIFY_ADMIN: "/admin/verify-admin",
    },
  },

  // Device routes
  DEVICE: {
    BASE: "/api/device",
    APP_KEYS: "/app_keys",
    DEVICE_DATA: "/device_data",
  },

  // Upload routes
  UPLOAD: {
    BASE: "/api",

    // File upload routes
    FILE_UPLOAD: {
      SINGLE: "/upload/single",
      DOC_DELETE: "/vehicle/doc-delete",
    },

    // File management routes
    FILE_MANAGEMENT: {
      INFO: "/file/info",
      URL: "/file/url",
      DELETE: "/file/delete",
    },
  },

  // Email routes
  EMAIL: {
    BASE: "/api/email",
    SEND: "/send",
    TEMPLATES: "/templates",
    SENDERS: "/senders",
  },

  // Admin/Policy routes
  ADMIN: {
    BASE: "/api/admin",
    GET_POLICIES: "/get-policies",
    UPDATE_POLICY: "/update-policy",
    GET_POLICY: "/policy/:policyName",

    USER: {
      DELETE_USER: "/delete/user",
    },
  },

  // QR Code routes
  QR: {
    BASE: "/api",
    CHECK_QR: "/check-qr",
    GENERATE_QR: "/generate-qr",
    QR_DETAILS: "/qr/:qr_id",
    GET_QR_TEMPLATES_BULK: "/create/qr-template-in-bluk",
    GET_QR_TEMPLATE_USER: "/create/qr-template-user/:qr_id",
    UPLODED_TEMPLATE: "/all/uploaded-template",
    VALIDATE_QR: "/validate-qr",
    ASSIGN_QR: "/assign-qr",
    QR_ASSIGNMENT: "/qr-assignment",
    VEHICLE_QR: "/vehicle-qr/:vehicleId",
    GET_USER_DETAILS: "/user-details/:qr_id",
  },

  // Fuel Price routes
  FUEL: {
    BASE: "/api",
    FUEL_PRICE: "/v1/fuel-price",
    ALL_FUEL_PRICES: "/v1/fuel-price/all",
    FUEL_PRICE_BY_STATE: "/v1/fuel-price/:state",
  },

  // Garage routes
  GARAGE: {
    BASE: "/api",
    ADD_VEHICLE: "/v1/add-vehicle",
    REFRESH_VEHICLE_DATA: "/v1/refresh/vehicle-data",
    ADD_USER_GARAGE: "/v1/user/add-garage",
    GET_GARAGE: "/v1/garage/:user_id",
    REMOVE_VEHICLE: "/v1/garage/remove-vehicle",
    CHECK_SECURITY_CODE: "/check/security-code",
    VERIFY_SECURITY_CODE: "/verify/security-code",
  },

  // Trending Cars routes
  TRENDING_CARS: {
    BASE: "/api",
    ADD_TRENDING_CAR: "/add/tranding/car",
    GET_CAR_LIST: "/list/all-car",
    GET_BY_ID: "/user/trending-cars/:car_id",
    DELETE_CAR_DETAILS: "/user/delete-car/:car_id",
  },

  // Fetch Trending routes
  FETCH_TRENDING: {
    BASE: "/api",
  },

  // Vehicle Comparison routes
  VEHICLE_COMPARISON: {
    BASE: "/api",
  },

  // Tips and Tricks routes
  TIPS_TRICKS: {
    BASE: "/api",
  },

  // Get Tips routes
  GET_TIPS: {
    BASE: "/api",
  },

  // News routes
  NEWS: {
    BASE: "/api",
    POST_NEWS: "/admin/news-post",
    GET_ALL_NEWS: "/admin/news",
    GET_NEWS_BY_ID: "/admin/news/:news_id",
    UPDATE_NEWS: "/admin/news/:news_id",
    DELETE_NEWS: "/admin/news/:news_id",
  },

  // Get News routes (user facing)
  GET_NEWS: {
    BASE: "/api",
  },

  // QR Videos routes
  QR_VIDEOS: {
    BASE: "/api",
  },

  // User routes
  USER: {
    BASE: "/api/v1/users",
    INITIATE_DELETION: "/initiate-deletion",
    CANCEL_DELETION: "/cancel-deletion",
    PROCESS_DELETIONS: "/process-deletions",
    DELETION_STATUS: "/:user_id/deletion-status",
  },

  // Update User routes
  UPDATE_USER: {
    BASE: "/api",
    UPDATE: "/update_user",
    GET_USER_DETAILS: "/get_user_details",
  },

  // Emergency Contact routes
  EMERGENCY_CONTACT: {
    BASE: "/api/v1",
    ADD_CONTACT: "/add/emergency-contact",
    UPDATE_CONTACTS: "/update/emergency-contact",
    DELETE_CONTACT: "/delete/emergency-contact",
  },

  // Addressbook routes
  ADDRESSBOOK: {
    BASE: "/api/v1/user-address",
    ADD_ADDRESS: "/add",
    UPDATE_ADDRESSES: "/upadte",
    DELETE_ADDRESS: "/delete",
  },

  // Primary Contact routes
  PRIMARY_CONTACT: {
    BASE: "/api/v1/user",
    CHANGE_REQUEST: "/change-primary-contact-request",
    CHANGE_VERIFICATION: "/change-primary-contact-verification",
    GET_STATUS: "/:user_id/primary-contact-status",
  },

  // Change Password routes
  CHANGE_PASSWORD: {
    BASE: "/api/v1/user",
    CHANGE: "/change-password",
    PASSWORD_HISTORY: "/:user_id/password-history",
    CHECK_STRENGTH: "/check-password-strength",
  },

  // Get Details routes
  GET_DETAILS: {
    BASE: "/",
    GET_DETAILS: "/",
    MULTIPLE: "/multiple",
    SUMMARY: "/:user_id/summary",
  },

  // Get News routes (user facing)
  GET_NEWS_UPDATE: {
    BASE: "/api",
    GET_LIST: "/user/news/list",
    GET_BY_ID: "/user/news/:news_id",
    GET_BY_TYPE: "/user/news/type/:news_type",
  },

  // Get Tips routes
  GET_TIPS_UPDATE: {
    BASE: "/api",
    GET_ALL: "/tips-tricks-list",
  },

  // Fetch Trending routes
  FETCH_TRENDING_UPDATE: {
    BASE: "/api",
    ADD_TO_TRENDING: "/add-vehicle-to-top_trending",
  },

  // Vehicle Comparison routes
  VEHICLE_COMPARISON_UPDATE: {
    BASE: "/api",
    COMPARE: "/vehicles/compare",
    UPDATE: "/vehicle/compare-update",
    GET_COMPARISON: "/vehicles/compare/get-all-compare",
    GET_BY_CARS: "/vehicles/compare/cars/:car_1/:car_2",
    DELETE_COMPARISON: "/vehicles/compare/:comparison_id",
  },

  // Tips and Tricks routes
  TIPS_TRICKS_UPDATE: {
    BASE: "/api",
    MANAGE: "/v1/tips-tricks",
    GET_ALL: "/v1/tips-tricks",
    GET_BY_ID: "/v1/tips-tricks/:tip_id",
    DELETE: "/v1/tips-tricks/:tip_id",
  },

  // QR Videos routes
  QR_VIDEOS_UPDATE: {
    BASE: "/api",
    MANAGE: "/qr-benefit-videos",
    GET_ALL: "/qr-benefit-videos",
    GET_BY_ID: "/qr-benefit-videos/:tutorial_video_id",
  },

  // Notification List routes
  NOTIFICATION_LIST_UPDATE: {
    BASE: "/",
    GET_LIST: "/",
    STATS: "/:user_id/stats",
    MARK_ALL_READ: "/:user_id/mark-all-read",
    DELETE_OLD: "/:user_id/delete-old",
  },

  // Notification routes
  NOTIFICATION: {
    BASE: "/api/notifications",
    SEND: "/send",
    SEND_NOTIFICATION_FOR_CALL: "/send/call-notification",
    GET_USER_NOTIFICATIONS: "/:user_id",
    DELETE_NOTIFICATIONS: "/delete",
    SEEN_NOTIFICATION: "/user/seen-notification",
    IS_ON_NOTIFICATION: "/user/on-notification",
    UNREAD_COUNT: "/:user_id/unread-count",
    CLEANUP: "/cleanup-expired-guests",
  },

  // Notification List routes
  NOTIFICATION_LIST: {
    BASE: "/",
  },

  // Access Code routes
  ACCESS_CODE: {
    BASE: "/verify-access-document",
    VERIFY: "/",
    GENERATE: "/generate",
    GET_STATUS: "/:user_id/:vehicle_id/status",
    CANCEL: "/cancel",
    CLEANUP: "/cleanup-expired",
  },

  // Vault Access routes
  VAULT_ACCESS: {
    BASE: "/",
    REQUEST: "/vault-document-access",
    REQUEST_VERIFY: "/vault-document-access/get-code",
    GET_HISTORY: "/:user_id/history",
    GET_STATS: "/:user_id/stats",
    REVOKE: "/revoke",
  },

  // Razorpay routes
  RAZORPAY: {
    BASE: "/razorpay",
    CREATE_ORDER: "/create-order",
    VERIFY_PAYMENT: "/verify-payment",
    GET_PAYMENT: "/payment/:payment_id",
    GET_ORDER: "/order/:order_id",
    GET_KEYS: "/keys",
    REFUND: "/refund",
  },

  // Order routes
  ORDER: {
    BASE: "/api",
    ADD_ACTIVE_PARTNER: "/admin/add-active-partner",
    USER_CREATE_ORDER: "/user/create-order",
    GET_ALL_NEW_ORDER_BYADMIN: "/admin/all-new-order",
    ADMIN_CONFIRM_ORDER: "/admin/order-confirm",
    ADMIN_GENERATE_MANIFEST: "/admin/generate-manifests/:order_id",
    ADMIN_GENERATE_SHIPROCKET_LABEL: "/admin/generate-shiprocket-label/:order_id",
    ADMIN_GENERATE_DELIVERY_LABEL: "/admin/generate-delivery-label/:order_id",
    // find from user myorder node
    USER_ORDERS: "/orders-user-list",
    USER_ORDER_DETAILS: "/orders/order-details",
    // find from direct order section
    FETCH_BY_ORDER_ID: "/admin/fetch/order-id",
    FETCH_BY_USER_ID: "/admin/fetch/user-id",
    CANCEL_ORDER_BY_ADMIN: "/orders/admin-cancel",
    CANCEL_ORDER_BY_USER: "/order/user-cancel",
    CHECK_COURIER_SERVICE: "/check/courier-service",
    // Track Order Status
    TRACK_ORDER_STATUS: "/track-order-status",
  },

  // Review routes
  REVIEW: {
    BASE: "/api",
    SUBMIT_REVIEW: "/review-submit",
    GET_PRODUCT_REVIEWS: "/reviews/:product_type",
    GET_USER_REVIEWS: "/reviews/user/:user_id",
    GET_AVERAGE_RATING: "/reviews/rating/:product_type",
    USER_FEEDBACK: "/user-feedback",
  },

  // Chat routes
  CHAT: {
    BASE: "/api",
    CREATE_ROOM_FOR_CHAT: "/create/room",
    GET_USER_CHATS_ROOM_DETAILS: "/user/chat-box-deatils",
    GET_CHAT_DETAILS: "/chats/details/:chatId",
    GET_ROOM_DETAILS: "/room/details/:room_id",
    SEND_MESSAGE: "/send/messages",
    GET_MESSAGES: "/messages/:chat_room_id",
    UPDATE_MESSAGE_STATUS: "/messages/:messageId/status",
    UNREAD_COUNT: "/messages/unread/:userId",
  },

  // Contact To User
  CONTACT: {
    BASE: "/api",
    CALL_USER: "/user/contact-via-call",
    SEND_SMS_NOTIFICATION: "/send/sms-notification",
  },

  SERVICE: {
    BASE: "/api",
    ADD_SERVICE: "/add/google-service",
    GET_SERVICE: "/get/all-service",
    UPDATE_SERVICE: "/update/google-service",
  },
};

module.exports = {
  API_ROUTES,
};
