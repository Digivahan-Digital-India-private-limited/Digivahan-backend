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
    GET_QR_TEMPLATES: "/qr-template/:qr_id",
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
    ADD_USER_GARAGE: "/v1/user/add-garage",
    GET_GARAGE: "/v1/garage/:user_id",
    REMOVE_VEHICLE: "/v1/garage/remove-vehicle",
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
    SEND_SMS_NOTIFICATION: "/send/sms-notification/:user_id",
    GET_USER_NOTIFICATIONS: "/:user_id",
    SEEN_NOTIFICATION: "/user/seen-notification",
    CHECK_SECURITY_CODE: "/check/security-code",
    VERIFY_SECURITY_CODE: "/verify/security-code",
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
    CREATE_ORDER: "/orders",
    // find from user myorder node
    USER_ORDERS: "/orders-user-list",
    USER_ORDER_DETAILS: "/orders/order-details",
    // find from direct order section
    FETCH_BY_ORDER_ID: "/admin/fetch/order-id",
    FETCH_BY_USER_ID: "/admin/fetch/user-id",
    CANCEL_ORDER: "/orders/cancel",
    CHECK_COURIER: "/check/courier-service",
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
};

// Full route paths
const FULL_ROUTES = {
  // Base routes
  BASE: API_ROUTES.BASE,
  HEALTH: API_ROUTES.HEALTH,

  // Auth routes
  AUTH: {
    BASE: API_ROUTES.AUTH.BASE,

    // Registration routes
    REGISTER: {
      INIT: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.REGISTER.INIT}`,
      VERIFY_OTP: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.REGISTER.VERIFY_OTP}`,
      RESEND_OTP: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.REGISTER.RESEND_OTP}`,
    },

    // Login routes
    LOGIN: {
      SIGN_IN: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.LOGIN.SIGN_IN}`,
      OTP_BASED_LOGIN: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.LOGIN.OTP_BASED_LOGIN}`,
      VERIFY_LOGIN_OTP: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.LOGIN.VERIFY_LOGIN_OTP}`,
    },

    // Password reset routes
    PASSWORD_RESET: {
      REQUEST: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.PASSWORD_RESET.REQUEST}`,
      VERIFY_OTP: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.PASSWORD_RESET.VERIFY_OTP}`,
    },

    // User verification routes
    USER_VERIFY: {
      REQUEST: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.USER_VERIFY.REQUEST}`,
      CONFIRM: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.USER_VERIFY.CONFIRM}`,
    },

    // User management routes
    USER_MANAGEMENT: {
      SUSPEND: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.USER_MANAGEMENT.SUSPEND}`,
      REMOVE_SUSPENSION: `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.USER_MANAGEMENT.REMOVE_SUSPENSION}`,
    },
  },

  // Device routes
  DEVICE: {
    BASE: API_ROUTES.DEVICE.BASE,
    APP_KEYS: `${API_ROUTES.DEVICE.BASE}${API_ROUTES.DEVICE.APP_KEYS}`,
    DEVICE_DATA: `${API_ROUTES.DEVICE.BASE}${API_ROUTES.DEVICE.DEVICE_DATA}`,
  },

  // Upload routes
  UPLOAD: {
    BASE: API_ROUTES.UPLOAD.BASE,

    // File upload routes
    FILE_UPLOAD: {
      SINGLE: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_UPLOAD.SINGLE}`,
      MULTIPLE: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_UPLOAD.MULTIPLE}`,
      PROFILE_IMAGE: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_UPLOAD.PROFILE_IMAGE}`,
      VEHICLE_DOCUMENT: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_UPLOAD.VEHICLE_DOCUMENT}`,
      VEHICLE_DOC: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_UPLOAD.VEHICLE_DOC}`,
    },

    // File management routes
    FILE_MANAGEMENT: {
      INFO: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_MANAGEMENT.INFO}`,
      URL: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_MANAGEMENT.URL}`,
      DELETE: `${API_ROUTES.UPLOAD.BASE}${API_ROUTES.UPLOAD.FILE_MANAGEMENT.DELETE}`,
    },
  },

  // Email routes
  EMAIL: {
    BASE: API_ROUTES.EMAIL.BASE,
    SEND: `${API_ROUTES.EMAIL.BASE}${API_ROUTES.EMAIL.SEND}`,
    TEMPLATES: `${API_ROUTES.EMAIL.BASE}${API_ROUTES.EMAIL.TEMPLATES}`,
    SENDERS: `${API_ROUTES.EMAIL.BASE}${API_ROUTES.EMAIL.SENDERS}`,
  },

  // Admin routes
  ADMIN: {
    BASE: API_ROUTES.ADMIN.BASE,
    GET_POLICIES: `${API_ROUTES.ADMIN.BASE}${API_ROUTES.ADMIN.GET_POLICIES}`,
    UPDATE_POLICY: `${API_ROUTES.ADMIN.BASE}${API_ROUTES.ADMIN.UPDATE_POLICY}`,
    GET_POLICY: `${API_ROUTES.ADMIN.BASE}${API_ROUTES.ADMIN.GET_POLICY}`,
  },

  // QR Code routes
  QR: {
    BASE: API_ROUTES.QR.BASE,
    GENERATE_QR: `${API_ROUTES.QR.BASE}${API_ROUTES.QR.GENERATE_QR}`,
    QR_DETAILS: `${API_ROUTES.QR.BASE}${API_ROUTES.QR.QR_DETAILS}`,
    VALIDATE_QR: `${API_ROUTES.QR.BASE}${API_ROUTES.QR.VALIDATE_QR}`,
    ASSIGN_QR: `${API_ROUTES.QR.BASE}${API_ROUTES.QR.ASSIGN_QR}`,
    QR_ASSIGNMENT: `${API_ROUTES.QR.BASE}${API_ROUTES.QR.QR_ASSIGNMENT}`,
    VEHICLE_QR: `${API_ROUTES.QR.BASE}${API_ROUTES.QR.VEHICLE_QR}`,
  },

  // Fuel Price routes
  FUEL: {
    BASE: API_ROUTES.FUEL.BASE,
    FUEL_PRICE: `${API_ROUTES.FUEL.BASE}${API_ROUTES.FUEL.FUEL_PRICE}`,
    ALL_FUEL_PRICES: `${API_ROUTES.FUEL.BASE}${API_ROUTES.FUEL.ALL_FUEL_PRICES}`,
    FUEL_PRICE_BY_STATE: `${API_ROUTES.FUEL.BASE}${API_ROUTES.FUEL.FUEL_PRICE_BY_STATE}`,
  },

  // Garage routes
  GARAGE: {
    BASE: API_ROUTES.GARAGE.BASE,
    ADD_VEHICLE: `${API_ROUTES.GARAGE.BASE}${API_ROUTES.GARAGE.ADD_VEHICLE}`,
    GET_GARAGE: `${API_ROUTES.GARAGE.BASE}${API_ROUTES.GARAGE.GET_GARAGE}`,
    REMOVE_VEHICLE: `${API_ROUTES.GARAGE.BASE}${API_ROUTES.GARAGE.REMOVE_VEHICLE}`,
  },

  // Trending Cars routes
  TRENDING_CARS: {
    BASE: API_ROUTES.TRENDING_CARS.BASE,
    MANAGE: `${API_ROUTES.TRENDING_CARS.BASE}${API_ROUTES.TRENDING_CARS.MANAGE}`,
    GET_BY_ID: `${API_ROUTES.TRENDING_CARS.BASE}${API_ROUTES.TRENDING_CARS.GET_BY_ID}`,
  },

  // Fetch Trending routes
  FETCH_TRENDING: {
    BASE: API_ROUTES.FETCH_TRENDING.BASE,
  },

  // Vehicle Comparison routes
  VEHICLE_COMPARISON: {
    BASE: API_ROUTES.VEHICLE_COMPARISON.BASE,
  },

  // Tips and Tricks routes
  TIPS_TRICKS: {
    BASE: API_ROUTES.TIPS_TRICKS.BASE,
  },

  // Get Tips routes
  GET_TIPS: {
    BASE: API_ROUTES.GET_TIPS.BASE,
  },

  // News routes
  NEWS: {
    BASE: API_ROUTES.NEWS.BASE,
    POST_NEWS: `${API_ROUTES.NEWS.BASE}${API_ROUTES.NEWS.POST_NEWS}`,
    GET_ALL_NEWS: `${API_ROUTES.NEWS.BASE}${API_ROUTES.NEWS.GET_ALL_NEWS}`,
    GET_NEWS_BY_ID: `${API_ROUTES.NEWS.BASE}${API_ROUTES.NEWS.GET_NEWS_BY_ID}`,
    UPDATE_NEWS: `${API_ROUTES.NEWS.BASE}${API_ROUTES.NEWS.UPDATE_NEWS}`,
    DELETE_NEWS: `${API_ROUTES.NEWS.BASE}${API_ROUTES.NEWS.DELETE_NEWS}`,
  },

  // Get News routes (user facing)
  GET_NEWS: {
    BASE: API_ROUTES.GET_NEWS.BASE,
  },

  // QR Videos routes
  QR_VIDEOS: {
    BASE: API_ROUTES.QR_VIDEOS.BASE,
  },

  // User routes
  USER: {
    BASE: API_ROUTES.USER.BASE,
    INITIATE_DELETION: `${API_ROUTES.USER.BASE}${API_ROUTES.USER.INITIATE_DELETION}`,
    CANCEL_DELETION: `${API_ROUTES.USER.BASE}${API_ROUTES.USER.CANCEL_DELETION}`,
    PROCESS_DELETIONS: `${API_ROUTES.USER.BASE}${API_ROUTES.USER.PROCESS_DELETIONS}`,
    DELETION_STATUS: `${API_ROUTES.USER.BASE}${API_ROUTES.USER.DELETION_STATUS}`,
  },

  // Update User routes
  UPDATE_USER: {
    BASE: API_ROUTES.UPDATE_USER.BASE,
    UPDATE: `${API_ROUTES.UPDATE_USER.BASE}${API_ROUTES.UPDATE_USER.UPDATE}`,
    GET_USER_DETAILS: `${API_ROUTES.UPDATE_USER.BASE}${API_ROUTES.UPDATE_USER.GET_USER_DETAILS}`,
  },

  // Emergency Contact routes
  EMERGENCY_CONTACT: {
    BASE: API_ROUTES.EMERGENCY_CONTACT.BASE,
    MANAGE: `${API_ROUTES.EMERGENCY_CONTACT.BASE}${API_ROUTES.EMERGENCY_CONTACT.MANAGE}`,
    GET_CONTACTS: `${API_ROUTES.EMERGENCY_CONTACT.BASE}${API_ROUTES.EMERGENCY_CONTACT.GET_CONTACTS}`,
    GET_CONTACT: `${API_ROUTES.EMERGENCY_CONTACT.BASE}${API_ROUTES.EMERGENCY_CONTACT.GET_CONTACT}`,
  },

  // Addressbook routes
  ADDRESSBOOK: {
    BASE: API_ROUTES.ADDRESSBOOK.BASE,
    MANAGE: `${API_ROUTES.ADDRESSBOOK.BASE}${API_ROUTES.ADDRESSBOOK.MANAGE}`,
    GET_ADDRESSES: `${API_ROUTES.ADDRESSBOOK.BASE}${API_ROUTES.ADDRESSBOOK.GET_ADDRESSES}`,
    GET_ADDRESS: `${API_ROUTES.ADDRESSBOOK.BASE}${API_ROUTES.ADDRESSBOOK.GET_ADDRESS}`,
  },

  // Primary Contact routes
  PRIMARY_CONTACT: {
    BASE: API_ROUTES.PRIMARY_CONTACT.BASE,
    CHANGE_REQUEST: `${API_ROUTES.PRIMARY_CONTACT.BASE}${API_ROUTES.PRIMARY_CONTACT.CHANGE_REQUEST}`,
    CHANGE_VERIFICATION: `${API_ROUTES.PRIMARY_CONTACT.BASE}${API_ROUTES.PRIMARY_CONTACT.CHANGE_VERIFICATION}`,
    GET_STATUS: `${API_ROUTES.PRIMARY_CONTACT.BASE}${API_ROUTES.PRIMARY_CONTACT.GET_STATUS}`,
  },

  // Change Password routes
  CHANGE_PASSWORD: {
    BASE: API_ROUTES.CHANGE_PASSWORD.BASE,
    CHANGE: `${API_ROUTES.CHANGE_PASSWORD.BASE}${API_ROUTES.CHANGE_PASSWORD.CHANGE}`,
    PASSWORD_HISTORY: `${API_ROUTES.CHANGE_PASSWORD.BASE}${API_ROUTES.CHANGE_PASSWORD.PASSWORD_HISTORY}`,
    CHECK_STRENGTH: `${API_ROUTES.CHANGE_PASSWORD.BASE}${API_ROUTES.CHANGE_PASSWORD.CHECK_STRENGTH}`,
  },

  // Get Details routes
  GET_DETAILS: {
    BASE: API_ROUTES.GET_DETAILS.BASE,
  },

  // Notification routes
  NOTIFICATION: {
    BASE: API_ROUTES.NOTIFICATION.BASE,
    SEND: `${API_ROUTES.NOTIFICATION.BASE}${API_ROUTES.NOTIFICATION.SEND}`,
    GET_USER_NOTIFICATIONS: `${API_ROUTES.NOTIFICATION.BASE}${API_ROUTES.NOTIFICATION.GET_USER_NOTIFICATIONS}`,
    MARK_READ: `${API_ROUTES.NOTIFICATION.BASE}${API_ROUTES.NOTIFICATION.MARK_READ}`,
    UNREAD_COUNT: `${API_ROUTES.NOTIFICATION.BASE}${API_ROUTES.NOTIFICATION.UNREAD_COUNT}`,
    CLEANUP: `${API_ROUTES.NOTIFICATION.BASE}${API_ROUTES.NOTIFICATION.CLEANUP}`,
  },

  // Notification List routes
  NOTIFICATION_LIST: {
    BASE: API_ROUTES.NOTIFICATION_LIST.BASE,
  },

  // Access Code routes
  ACCESS_CODE: {
    BASE: API_ROUTES.ACCESS_CODE.BASE,
    VERIFY: `${API_ROUTES.ACCESS_CODE.BASE}${API_ROUTES.ACCESS_CODE.VERIFY}`,
    GENERATE: `${API_ROUTES.ACCESS_CODE.BASE}${API_ROUTES.ACCESS_CODE.GENERATE}`,
    GET_STATUS: `${API_ROUTES.ACCESS_CODE.BASE}${API_ROUTES.ACCESS_CODE.GET_STATUS}`,
    CANCEL: `${API_ROUTES.ACCESS_CODE.BASE}${API_ROUTES.ACCESS_CODE.CANCEL}`,
    CLEANUP: `${API_ROUTES.ACCESS_CODE.BASE}${API_ROUTES.ACCESS_CODE.CLEANUP}`,
  },

  // Vault Access routes
  VAULT_ACCESS: {
    BASE: API_ROUTES.VAULT_ACCESS.BASE,
    REQUEST: `${API_ROUTES.VAULT_ACCESS.BASE}${API_ROUTES.VAULT_ACCESS.REQUEST}`,
    REQUEST_VERIFY: `${API_ROUTES.VAULT_ACCESS.BASE}${API_ROUTES.VAULT_ACCESS.REQUEST_VERIFY}`,
    GET_HISTORY: `${API_ROUTES.VAULT_ACCESS.BASE}${API_ROUTES.VAULT_ACCESS.GET_HISTORY}`,
    GET_STATS: `${API_ROUTES.VAULT_ACCESS.BASE}${API_ROUTES.VAULT_ACCESS.GET_STATS}`,
    REVOKE: `${API_ROUTES.VAULT_ACCESS.BASE}${API_ROUTES.VAULT_ACCESS.REVOKE}`,
  },

  // Razorpay routes
  RAZORPAY: {
    BASE: API_ROUTES.RAZORPAY.BASE,
    CREATE_ORDER: `${API_ROUTES.RAZORPAY.BASE}${API_ROUTES.RAZORPAY.CREATE_ORDER}`,
    VERIFY_PAYMENT: `${API_ROUTES.RAZORPAY.BASE}${API_ROUTES.RAZORPAY.VERIFY_PAYMENT}`,
    GET_PAYMENT: `${API_ROUTES.RAZORPAY.BASE}${API_ROUTES.RAZORPAY.GET_PAYMENT}`,
    GET_ORDER: `${API_ROUTES.RAZORPAY.BASE}${API_ROUTES.RAZORPAY.GET_ORDER}`,
    GET_KEYS: `${API_ROUTES.RAZORPAY.BASE}${API_ROUTES.RAZORPAY.GET_KEYS}`,
    REFUND: `${API_ROUTES.RAZORPAY.BASE}${API_ROUTES.RAZORPAY.REFUND}`,
  },

  // Order routes
  ORDER: {
    BASE: API_ROUTES.ORDER.BASE,
    CREATE_ORDER: `${API_ROUTES.ORDER.BASE}${API_ROUTES.ORDER.CREATE_ORDER}`,
    USER_ORDERS: `${API_ROUTES.ORDER.BASE}${API_ROUTES.ORDER.USER_ORDERS}`,
    ORDER_DETAILS: `${API_ROUTES.ORDER.BASE}${API_ROUTES.ORDER.ORDER_DETAILS}`,
    CANCEL_ORDER: `${API_ROUTES.ORDER.BASE}${API_ROUTES.ORDER.CANCEL_ORDER}`,
  },

  // Review routes
  REVIEW: {
    BASE: API_ROUTES.REVIEW.BASE,
    SUBMIT_REVIEW: `${API_ROUTES.REVIEW.BASE}${API_ROUTES.REVIEW.SUBMIT_REVIEW}`,
    GET_PRODUCT_REVIEWS: `${API_ROUTES.REVIEW.BASE}${API_ROUTES.REVIEW.GET_PRODUCT_REVIEWS}`,
    GET_USER_REVIEWS: `${API_ROUTES.REVIEW.BASE}${API_ROUTES.REVIEW.GET_USER_REVIEWS}`,
    GET_AVERAGE_RATING: `${API_ROUTES.REVIEW.BASE}${API_ROUTES.REVIEW.GET_AVERAGE_RATING}`,
    USER_FEEDBACK: `${API_ROUTES.REVIEW.BASE}${API_ROUTES.REVIEW.USER_FEEDBACK}`,
  },

  // Chat routes
  CHAT: {
    BASE: API_ROUTES.CHAT.BASE,
    CREATE_OR_GET_CHAT: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.CREATE_OR_GET_CHAT}`,
    GET_USER_CHATS: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.GET_USER_CHATS}`,
    GET_CHAT_DETAILS: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.GET_CHAT_DETAILS}`,
    SEND_MESSAGE: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.SEND_MESSAGE}`,
    GET_MESSAGES: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.GET_MESSAGES}`,
    UPDATE_MESSAGE_STATUS: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.UPDATE_MESSAGE_STATUS}`,
    UNREAD_COUNT: `${API_ROUTES.CHAT.BASE}${API_ROUTES.CHAT.UNREAD_COUNT}`,
  },
};

module.exports = {
  API_ROUTES,
  FULL_ROUTES,
};
