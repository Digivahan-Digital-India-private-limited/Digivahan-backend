/**
 * Message Constants
 * Centralized definition of all messages used throughout the application
 */

const SUCCESS_MESSAGES = {
  // Registration messages
  OTP_SENT: "OTP sent successfully",
  OTP_SENT_EMAIL: "OTP sent via email.",
  OTP_SENT_PHONE: "OTP sent via phone.",
  OTP_VERIFIED: "OTP verified successfully",
  ACCOUNT_CREATED: "OTP verified. Account created successfully.",
  OTP_RESENT: "OTP resent successfully",

  // Login messages
  LOGIN_SUCCESS: "Login successful",
  OTP_VERIFIED_LOGIN: "OTP verified successfully",

  // Password reset messages
  PASSWORD_RESET_SUCCESS: "Password reset successful",

  // User verification messages
  VERIFICATION_OTP_SENT: "OTP sent successfully",
  EMAIL_VERIFIED: "Email verified successfully",
  PHONE_VERIFIED: "Phone number verified successfully",

  // General messages
  SERVER_RUNNING: "Server is running",
  DATABASE_CONNECTED: "Connected",
  HEALTH_OK: "OK",

  // App Keys messages
  KEYS_UPDATED_SUCCESSFULLY: "keys updated success fully",
  DATA_NOT_FOUND: "Data Not found",
  DATA_NOT_UPDATED: "Data not updated.",

  // Device Data messages
  DEVICE_ADDED_SUCCESSFULLY: "Device is add in the device list",
  DEVICE_REMOVED_SUCCESSFULLY: "Device is removed from the device list",
  UUID_NOT_FOUND: "uuid not found in the list",

  // User suspension messages
  USER_SUSPENDED_SUCCESSFULLY: "User suspended successfully",
  USER_ALREADY_SUSPENDED: "User is already suspended",
  USER_NOT_SUSPENDED: "User is not suspended",
  USER_SUSPENDED_UNTIL: "User is suspended until",
  SUSPENSION_EXPIRED: "Suspension has expired",
  USER_ACTIVATED_SUCCESSFULLY: "User activated successfully",

  // Email messages
  EMAIL_SENT_SUCCESSFULLY: "Email sent successfully.",
  EMAIL_TEMPLATE_NOT_FOUND: "Email template not found",
  EMAIL_SENDER_NOT_FOUND: "Invalid sender email or missing template",

  // File upload messages
  FILE_UPLOADED_SUCCESSFULLY: "File uploaded successfully",
  FILES_UPLOADED_SUCCESSFULLY: "Files uploaded successfully",
  FILE_DELETED_SUCCESSFULLY: "File deleted successfully",
  FILE_INFO_RETRIEVED: "File information retrieved successfully",
  FILE_URL_RETRIEVED: "File URL retrieved successfully",
  PROFILE_IMAGE_UPLOADED: "Profile image uploaded successfully",
  VEHICLE_DOCUMENT_UPLOADED: "Vehicle document uploaded successfully",
  VEHICLE_DOCUMENT_UPLOADED_GARAGE:
    "Document has been uploaded and reference has been shared in the garage succesfully.",

  // Policies messages
  POLICIES_RETRIEVED_SUCCESSFULLY: "Policies retrieved successfully",

  // QR Code messages
  QR_GENERATED_SUCCESSFULLY: "QR Generated Successfully",
  QR_ASSIGNED_SUCCESSFULLY: "QR assigned successfully",

  // Fuel Price messages
  FUEL_PRICE_UPDATED: "Fuel price has been updated for the selected state",
  FUEL_PRICE_RETRIEVED: "Fuel price retrieved successfully",
  FUEL_PRICE_LIST_RETRIEVED: "Here is the complete node of fuels list",
  NO_FUEL_PRICE_DATA: "No fuel price data available",

  // Garage messages
  VEHICLE_ADDED_SUCCESSFULLY: "Vehicle added to garage successfully.",
  VEHICLE_REMOVED_SUCCESSFULLY: "Vehicle removed from garage successfully.",
  VEHICLE_REMOVED_FROM_GARAGE: "Vehicle successfully removed from your garage.",
  GARAGE_RETRIEVED_SUCCESSFULLY: "Garage data retrieved successfully",

  // Trending Cars messages
  TRENDING_CARS_ADDED_SUCCESSFULLY: "Trending cars added successfully",
  TRENDING_CARS_DELETED_SUCCESSFULLY: "Trending cars Deleted successfully",
  TRENDING_CARS_FETCHED_SUCCESSFULLY: "Trending cars fetched successfully",
  TRENDING_CAR_FETCHED_SUCCESSFULLY: "Trending car fetched successfully",

  // Vehicle Comparison messages
  COMPARISON_DATA_ADDED_SUCCESSFULLY: "Comparison data added successfully",
  COMPARISONS_FETCHED_SUCCESSFULLY: "Comparisons fetched successfully",
  COMPARISON_FETCHED_SUCCESSFULLY: "Comparison fetched successfully",
  COMPARISON_DELETED_SUCCESSFULLY: "Comparison deleted successfully",

  // Tips and Tricks messages
  TIPS_TRICKS_ADDED_SUCCESSFULLY: "Tips and Tricks added successfully.",
  TIPS_TRICKS_UPDATED_SUCCESSFULLY: "Tips and Tricks updated successfully.",
  TIPS_TRICKS_FETCHED_SUCCESSFULLY: "Tips and Tricks fetched successfully",
  TIP_FETCHED_SUCCESSFULLY: "Tip fetched successfully",
  TIP_DELETED_SUCCESSFULLY: "Tip deleted successfully",
  DATA_FETCHED_SUCCESSFULLY: "data fetched successfully.",

  // News messages
  NEWS_POSTED_SUCCESSFULLY: "News posted successfully.",
  NEWS_UPDATED_SUCCESSFULLY: "News updated successfully",
  NEWS_FETCHED_SUCCESSFULLY: "News fetched successfully",
  NEWS_DELETED_SUCCESSFULLY: "News deleted successfully",
  NEWS_LIST_FETCHED_SUCCESSFULLY: "News list fetched successfully.",

  // QR Videos messages
  USER_TUTORIAL_VIDEO_ADDED_SUCCESSFULLY:
    "User tutorial_video added successfully",
  USER_TUTORIAL_VIDEO_UPDATED_SUCCESSFULLY:
    "User tutorial_video updated successfully",
  USER_TUTORIAL_VIDEO_DELETED_SUCCESSFULLY:
    "User tutorial_video deleted successfully",
  QR_VIDEOS_FETCHED_SUCCESSFULLY: "QR videos fetched successfully",
  QR_VIDEO_FETCHED_SUCCESSFULLY: "QR video fetched successfully",
  VIDEOS_FETCHED_SUCCESSFULLY: "Videos fetched successfully",

  // User Deletion messages
  USER_DELETION_SCHEDULED: "User deletion scheduled after {days} days",
  USER_DELETION_IMMEDIATE: "User deletion scheduled immediately",
  USER_DELETION_CANCELLED: "User deletion cancelled successfully",
  DELETION_PROCESS_COMPLETED: "Deletion process completed successfully",

  // User Update messages
  USER_UPDATED_SUCCESSFULLY: "updated successful",
  USER_DETAILS_RETRIEVED: "User details retrieved successfully",

  // Emergency Contact messages
  EMERGENCY_CONTACT_ADDED: "New Emergency contact added successfully",
  EMERGENCY_CONTACT_UPDATED: "Emergency contact updated successfully",
  EMERGENCY_CONTACT_DELETED: "Emergency contact deleted successfully",
  EMERGENCY_CONTACTS_RETRIEVED: "Emergency contacts retrieved successfully",
  EMERGENCY_CONTACT_RETRIEVED: "Emergency contact retrieved successfully",

  // Addressbook messages
  ADDRESS_ADDED_SUCCESSFULLY: "New Address added successfully",
  ADDRESS_UPDATED_SUCCESSFULLY: "Address updated successfully",
  ADDRESS_DELETED_SUCCESSFULLY: "Address deleted successfully",
  DEFAULT_ADDRESS_UPDATED: "Default address updated successfully",
  ADDRESS_BOOK_RETRIEVED: "Address book retrieved successfully",
  ADDRESS_RETRIEVED: "Address retrieved successfully",

  // Primary Contact Change messages
  OTP_SENT_EMAIL: "OTP Sent successfully on {email}",
  OTP_SENT_PHONE: "OTP Sent successfully on {phone}",
  EMAIL_SET_AS_PRIMARY: "Email has been set as primary",
  PHONE_SET_AS_PRIMARY: "Phone has been set as primary",
  PRIMARY_CONTACT_STATUS_RETRIEVED:
    "Primary contact status retrieved successfully",

  // Change Password messages
  PASSWORD_CHANGED_SUCCESSFULLY: "Password has been successfully updated.",
  PASSWORD_HISTORY_RETRIEVED: "Password history retrieved successfully",
  PASSWORD_STRENGTH_CHECKED: "Password strength checked successfully",

  // Get Details messages
  USER_DETAILS_FETCHED: "User details fetched successfully.",
  USER_ADDRESSBOOK_FETCHED: "User addressbook fetched successfully.",
  USER_EMERGENCY_CONTACTS_FETCHED:
    "User emergency contacts fetched successfully.",
  USER_GARAGE_DETAILS_FETCHED: "User garage details fetched successfully.",
  USER_DEVICE_LIST_FETCHED: "User device list fetched successfully.",
  USER_ACCOUNT_STATUS_FETCHED: "User account status fetched successfully.",
  USER_SUSPEND_TIME_FETCHED: "User suspend time fetched successfully.",
  USER_CHAT_ROOM_FETCHED: "User chat room fetched successfully.",
  USER_SUMMARY_FETCHED: "User summary fetched successfully.",

  // Notification messages
  NOTIFICATION_SENT_SUCCESSFULLY: "Notification sent successfully",
  NOTIFICATION_SENT_SUCCESSFULLY_CHAT:
    "Notification sent successfully for chat",
  NOTIFICATIONS_RETRIEVED: "Notifications retrieved successfully",
  NOTIFICATIONS_MARKED_AS_READ: "Notifications marked as read successfully",
  UNREAD_COUNT_RETRIEVED: "Unread count retrieved successfully",
  EXPIRED_GUESTS_CLEANED_UP:
    "Expired guest notifications cleaned up successfully",

  // Notification List messages
  NOTIFICATION_LIST_RETRIEVED: "successful",
  NOTIFICATION_STATS_RETRIEVED:
    "Notification statistics retrieved successfully",
  ALL_NOTIFICATIONS_MARKED_AS_READ:
    "All notifications marked as read successfully",
  OLD_NOTIFICATIONS_DELETED: "Old notifications deleted successfully",

  // Access Code messages
  VAULT_ACCESS_GRANTED: "Vault access granted successfully",
  ACCESS_CODE_GENERATED: "Access code generated successfully",
  ACCESS_CODE_STATUS_RETRIEVED: "Access code status retrieved successfully",
  ACCESS_CODE_CANCELLED: "Access code cancelled successfully",
  EXPIRED_ACCESS_CODES_CLEANED_UP:
    "Expired access codes cleaned up successfully",

  // Vault Access messages
  VAULT_ACCESS_HISTORY_RETRIEVED: "Vault access history retrieved successfully",
  VAULT_ACCESS_STATS_RETRIEVED:
    "Vault access statistics retrieved successfully",
  VAULT_ACCESS_REVOKED: "Vault access revoked successfully",
  VAULT_ACCESS_REQUEST_MADE: "Request made successfully for the vehicle",

  // Razorpay messages
  ORDER_CREATED_SUCCESSFULLY: "Order created successfully",
  PAYMENT_VERIFIED: "Payment verified successfully",
  ORDER_DETAILS_RETRIEVED: "Order details retrieved successfully",
  PAYMENT_DETAILS_RETRIEVED: "Payment details retrieved successfully",
  PAYMENT_REFUNDED: "Payment refunded successfully",
  RAZORPAY_KEYS_RETRIEVED: "Razorpay keys retrieved successfully",

  // Order messages
  ORDER_CREATED: "Orders created successfully",
  ORDER_CANCELLED: "Order cancelled successfully",
  ORDER_DETAILS_FETCHED: "Order details retrieved successfully",
  USER_ORDERS_FETCHED: "User orders retrieved successfully",
  ORDERS_FETCHED: "Orders fetched successfully",

  // Review messages
  REVIEW_SUBMITTED: "Review submitted successfully",
  REVIEW_RETRIEVED: "Reviews retrieved successfully",
  USER_REVIEWS_RETRIEVED: "User reviews retrieved successfully",
  RATING_STATS_RETRIEVED: "Rating statistics retrieved successfully",
  USER_FEEDBACKS_FETCHED: "User feedbacks fetched successfully",

  // Chat messages
  CHAT_CREATED: "Chat created successfully",
  CHATS_RETRIEVED: "Chats retrieved successfully",
  CHAT_RETRIEVED: "Chat retrieved successfully",
  MESSAGE_SENT: "Message sent successfully",
  MESSAGES_RETRIEVED: "Messages retrieved successfully",
  MESSAGE_STATUS_UPDATED: "Message status updated successfully",
  UNREAD_COUNT_RETRIEVED: "Unread count retrieved successfully",
};

const ERROR_MESSAGES = {
  // Validation errors
  VALIDATION_FAILED: "Validation failed",
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Please provide a valid email address",
  INVALID_PHONE: "Please provide a valid phone number",
  INVALID_PASSWORD:
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  INVALID_OLD_PASSWORD: "Old passowrd does'nt match",
  INVALID_OTP: "Invalid or expired OTP",
  INVALID_LOGIN_TYPE: "Login type must be either 'email' or 'phone'",
  INVALID_LOGIN_VIA: "Login via must be either 'email' or 'phone'",
  INVALID_OTP_CHANNEL: "OTP channel must be either 'email' or 'phone'",
  INVALID_HIT_TYPE: "Hit type must be either 'check' or 'register'",
  INVALID_PARAMETER: "You have entered invalid parameter",

  // Authentication errors
  USER_NOT_FOUND: "User not found with this email/phone",
  INVALID_USER_ID: "Invalid user id.",
  INVALID_CREDENTIALS: "Invalid email/phone or password",
  ACCOUNT_NOT_VERIFIED: "Please verify your account before login",
  ACCOUNT_DEACTIVATED: "Account is deactivated. Please contact support.",
  USER_ALREADY_EXISTS: "User already exists with this email or phone number",
  INVALID_TEMP_USER_ID: "Invalid or expired temporary user ID",
  INVALID_USER_REGISTER_ID: "User Not found",
  EMAIL_ALREADY_REGISTERED: "This email is already registered",
  PHONE_ALREADY_REGISTERED: "This phone number is already registered",
  USER_DOES_NOT_EXIST: "User does not exist",
  EMAIL_NOT_REGISTERED: "email not registered",
  PHONE_NOT_REGISTERED: "phone number not registered",
  INVALID_PASSWORD: "Invalid password",
  EMAIL_VERIFY_REQUIRED: "Please verify your email before login",
  PHONE_VERIFY_REQUIRED: "Please verify your phone number before login",

  // File upload errors
  NO_FILE_UPLOADED: "No file uploaded",
  NO_FILES_UPLOADED: "No files uploaded",
  FILE_UPLOAD_FAILED: "File upload failed",
  FILE_DELETE_FAILED: "File deletion failed",
  FILE_NOT_FOUND: "File not found",
  FILE_ID_REQUIRED: "File ID is required",
  INVALID_FILE_TYPE: "Invalid file type",
  INVALID_IMAGE_TYPE:
    "Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed",
  INVALID_DOCUMENT_TYPE:
    "Invalid document type. Only JPEG, PNG, and PDF are allowed",
  FILE_SIZE_TOO_LARGE: "File size too large",
  TOO_MANY_LOGIN_ATTEMPTS: "Too many login attempts. Please try again later.",
  EMAIL_NOT_REGISTERED_OTP: "Entered email not registered",
  PHONE_NOT_REGISTERED_OTP: "Entered phone number not registered",
  OTP_VERIFIED_SUCCESS: "OTP verified successfully",
  OTP_INVALID: "You have entered invalid OTP",
  OTP_EXPIRED_VERIFY: "The OTP you have entered is expired.",
  EMAIL_NOT_REGISTERED_RESET: "Entered email not registered",
  PHONE_NOT_REGISTERED_RESET: "Entered phone number not registered",
  EMAIL_NOT_VERIFIED_RESET: "Entered email not verified",
  PHONE_NOT_VERIFIED_RESET: "Entered phone number not verified",
  PASSWORD_USED_PREVIOUSLY:
    "Password is used previously please use new password",
  PASSWORD_RESET_SUCCESS: "Password reset successful",
  EMAIL_VERIFIED_SUCCESS: "email verified successfully",
  PHONE_VERIFIED_SUCCESS: "Phone number verified successfully",

  // OTP errors
  OTP_LIMIT_REACHED: "OTP limit reached for today. Try again tomorrow.",
  OTP_EXPIRED: "OTP has expired",
  OTP_ALREADY_USED: "OTP has already been used",
  MAX_ATTEMPTS_REACHED: "Maximum OTP attempts reached. Please try again later.",
  OTP_SEND_FAILED: "Failed to send OTP. Please try again.",
  INVALID_OTP_CODE: "You have entered invalid or expired OTP",

  // Password errors
  SAME_PASSWORD: "New password must be different from current password",
  OLD_PASSWORD_REUSE: "New password cannot be one of your last 4 passwords",

  // Server errors
  INTERNAL_SERVER_ERROR: "Internal server error",
  DATABASE_ERROR: "Database connection error",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",

  // User suspension errors
  USER_SUSPENDED: "User is suspended",
  SUSPENSION_ACTIVE: "Account is suspended",
  INVALID_SUSPENSION_DATE: "Invalid suspension date",
  SUSPENSION_DATE_PAST: "Suspension date cannot be in the past",
  USER_ID_INVALID: "User ID is invalid",
  USER_NOT_FOUND_OR_NOT_SUSPENDED: "User not found or not suspended",
  SERVER_ISSUE: "Server Issue",

  // Email errors
  EMAIL_SEND_FAILED: "Failed to send email",
  INVALID_EMAIL_ADDRESS: "Invalid email address",
  INVALID_SENDER_EMAIL: "Invalid sender email",
  INVALID_RECIPIENT_EMAIL: "Invalid recipient email",
  EMAIL_TEMPLATE_ERROR: "Email template error",
  EMAIL_ATTACHMENT_ERROR: "Email attachment error",

  // Policies errors
  POLICIES_RETRIEVAL_FAILED: "Failed to retrieve policies",
  SERVER_ERROR: "Server Error",

  // QR Code errors
  QR_GENERATION_FAILED: "Failed to generate QR code",
  INVALID_PARAMETER: "You have entered invalid parameter",
  INVALID_QR_ID: "Invalid QR ID",
  QR_ALREADY_ASSIGNED: "QR Already Assigend",
  QR_DAMAGED: "QR is vertually damaged",
  VEHICLE_ALREADY_ASSIGNED: "Vehicle is already connect to a qr code.",

  // Fuel Price errors
  STATE_NOT_FOUND: "State not found",
  FUEL_PRICE_UPDATE_FAILED: "Failed to update fuel price",
  FUEL_PRICE_RETRIEVAL_FAILED: "Failed to retrieve fuel price",

  // Garage errors
  VEHICLE_ALREADY_EXISTS: "Vehicle already exists in your garage.",
  RTO_API_FAILED: "Unable to fetch data from RTO. Invalid Vehicle Number",
  INVALID_VEHICLE_NUMBER: "The vehicle number you have entered is invalid",
  VEHICLE_NOT_FOUND: "Vehicle not found in your garage",
  VEHICLE_NOT_FOUND_IN_GARAGE: "No such vehicle found in user garage.",
  VEHICLE_NOT_FOUND_IN_GARAGE_SPECIFIC:
    "Vehicle number you have enter does not exist in your garage.",
  GARAGE_NOT_FOUND: "Garage not found",
  DOC_UPLOAD_FAILED: "Doc is not uploaded please try again.",

  // Trending Cars errors
  CAR_ID_DOES_NOT_EXIST: "car id does not exist",
  SERVER_NOT_WORKING: "server not working.",
  INVALID_HIT_TYPE: "Invalid hit_type. Must be 'add', 'delete', or 'fetch'",

  // Vehicle Comparison errors
  COMPARISON_ID_DOES_NOT_EXIST: "comparison id does not exist",
  COMPARISON_NOT_FOUND: "comparison not found",
  SAME_CAR_COMPARISON: "Cannot compare a car with itself",

  // Tips and Tricks errors
  TIP_ID_DOES_NOT_EXIST: "tip id does not exist",
  TIP_NOT_FOUND: "tip not found",
  NO_TIPS_FOUND: "No tips found.",
  SERVER_ISSUE: "Server issue",

  // News errors
  FAILED_TO_POST_NEWS: "Failed to post news.",
  FAILED_TO_FETCH_NEWS: "Failed to fetch news",
  FAILED_TO_UPDATE_NEWS: "Failed to update news",
  FAILED_TO_DELETE_NEWS: "Failed to delete news",
  NEWS_NOT_FOUND: "News not found",
  INVALID_NEWS_TYPE: "Invalid news type",

  // QR Videos errors
  VIDEO_NOT_FOUND: "Video not found",
  FAILED_TO_ADD_VIDEO: "Failed to add video",
  FAILED_TO_UPDATE_VIDEO: "Failed to update video",
  FAILED_TO_DELETE_VIDEO: "Failed to delete video",
  FAILED_TO_FETCH_VIDEOS: "Failed to fetch videos",
  SERVER_ERROR_WHILE_FETCHING_VIDEOS: "Server error while fetching videos",

  // User Deletion errors
  DELETION_ALREADY_REQUESTED: "User deletion process already initiated",
  DELETION_NOT_PENDING: "No pending deletion found for this user",
  DELETION_FAILED: "Failed to process user deletion",
  INVALID_DELETION_TYPE: "Invalid deletion type. Must be 'all' or 'status'",
  INVALID_DELETION_TIME: "Invalid deletion time. Must be between 0 and 30 days",

  // User Update errors
  USER_UPDATE_FAILED: "Failed to update user details",
  INVALID_UPDATE_DETAILS:
    "Invalid update details. Must be 'basic_details' or 'public_details'",
  INVALID_IMAGE_FORMAT:
    "Invalid image format. Only JPEG, PNG, GIF, and WebP are allowed",
  IMAGE_UPLOAD_FAILED: "Failed to upload image",
  PROFILE_UPDATE_FAILED: "Failed to update profile",

  // Emergency Contact errors
  EMERGENCY_CONTACT_NOT_FOUND:
    "No valid contact id provided or contact not found",
  EMERGENCY_CONTACT_ADD_FAILED: "Failed to add emergency contact",
  EMERGENCY_CONTACT_UPDATE_FAILED: "Failed to update emergency contact",
  EMERGENCY_CONTACT_DELETE_FAILED: "Failed to delete emergency contact",
  INVALID_HIT_TYPE: "Invalid hit type. Must be 'add', 'edit', or 'delete'",
  CONTACT_ID_REQUIRED: "Contact ID is required for edit and delete operations",
  INVALID_BASE64_IMAGE: "Invalid base64 image format",

  // Addressbook errors
  ADDRESS_NOT_FOUND: "Provided address id does not exist.",
  ADDRESS_ADD_FAILED: "Failed to add address",
  ADDRESS_UPDATE_FAILED: "Failed to update address",
  ADDRESS_DELETE_FAILED: "Failed to delete address",
  ADDRESS_ID_REQUIRED: "Address ID is required for edit and delete operations",
  INVALID_DEFAULT_STATUS: "Default status must be true or false",
  MULTIPLE_DEFAULT_ADDRESSES: "Only one address can be marked as default",

  // Primary Contact Change errors
  EMAIL_ALREADY_PRIMARY: "The selected account is already primary",
  PHONE_ALREADY_PRIMARY: "The selected account is already primary",
  EMAIL_NOT_VERIFIED: "This email is not verified.",
  PHONE_NOT_VERIFIED: "This phone number is not verified",
  NO_PRIMARY_CONTACT_SET: "No primary contact is currently set",
  NO_PENDING_PRIMARY_CHANGE: "No pending primary contact change request found",
  PRIMARY_CONTACT_CHANGE_FAILED: "Failed to change primary contact",
  INVALID_SET_PRIMARY:
    "Invalid set_primary value. Must be 'mobile', 'email', or 'phone'",

  // Change Password errors
  INVALID_CURRENT_PASSWORD: "The current password is not matching",
  PASSWORD_TOO_SHORT: "Password is required",
  PASSWORD_CHANGE_FAILED: "Failed to change password",
  PASSWORD_HISTORY_NOT_FOUND: "Password history not found",
  INVALID_PASSWORD_FORMAT:
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",

  // Get Details errors
  INVALID_DETAILS_TYPE: "Invalid details type provided",
  USER_DETAILS_NOT_FOUND: "User details not found",
  GARAGE_DATA_NOT_FOUND: "Garage data not found",
  DEVICE_DATA_NOT_FOUND: "Device data not found",
  CHAT_ROOM_NOT_FOUND: "Chat room data not found",
  INVALID_DETAILS_TYPES_ARRAY: "Invalid details types array provided",

  // Notification errors
  NOTIFICATION_SEND_FAILED: "Failed to send notification",
  NOTIFICATION_NOT_FOUND: "Notification not found",
  ONESIGNAL_CONFIG_ERROR: "OneSignal configuration error",
  ONESIGNAL_SEND_FAILED: "OneSignal notification send failed",
  DEVICE_NOT_FOUND: "Device not found for user",
  TEMP_USER_CREATION_FAILED: "Failed to create temporary user",
  NOTIFICATION_RETRIEVAL_FAILED: "Failed to retrieve notifications",
  NOTIFICATION_UPDATE_FAILED: "Failed to update notification",
  RATE_LIMIT_EXCEEDED: "Too many login attempts. Please try again later.",

  // Notification List errors
  INVALID_PAGE_NUMBER: "Invalid page number",
  INVALID_LIMIT: "Invalid limit value",
  INVALID_NOTIFICATION_TYPE: "Invalid notification type",
  NO_PAGE_AVAILABLE: "No Page available",
  PAGE_LIMIT_REACHED: "Page limit reached",
  NOTIFICATION_LIST_RETRIEVAL_FAILED: "Failed to retrieve notification list",
  NOTIFICATION_STATS_FAILED: "Failed to retrieve notification statistics",

  // Access Code errors
  INVALID_USER_ID: "invalid user id",
  VEHICLE_NOT_FOUND: "vehicle not found",
  NO_REQUEST_RAISED: "No request raised",
  ACCESS_CODE_EXPIRED: "Access code has expired",
  ACCESS_CODE_ALREADY_USED: "Access code has already been used",
  ACCESS_CODE_INVALID: "Invalid access code",
  NO_ACTIVE_ACCESS_CODE: "No active access code found",
  ACCESS_CODE_GENERATION_FAILED: "Failed to generate access code",
  ACCESS_CODE_VERIFICATION_FAILED: "Failed to verify access code",

  // Vault Access errors
  UNAUTHORIZED_ACCESS: "unauthorised access",
  VAULT_ACCESS_DENIED: "Vault access denied",
  INVALID_REQUESTER_ID: "Invalid requester ID",
  INVALID_SECURITY_CODE: "Invalid security code",
  VAULT_ACCESS_FAILED: "Failed to access vault",
  VAULT_ACCESS_REVOKE_FAILED: "Failed to revoke vault access",

  // Razorpay errors
  INVALID_AMOUNT: "Invalid amount provided",
  INVALID_SIGNATURE: "Invalid payment signature",
  RAZORPAY_ERROR: "Razorpay API error",
  PAYMENT_VERIFICATION_FAILED: "Failed to verify payment",
  REFUND_FAILED: "Failed to process refund",
  INVALID_PAYMENT_ID: "Invalid payment ID",
  PAYMENT_NOT_FOUND: "Payment not found",

  // Order errors
  ORDER_CREATION_FAILED: "We cant place any order at this time",
  INVALID_USER_ID_ORDER: "Invalid user id",
  INVALID_ORDER_ID: "Invalid order id",
  NO_ORDERS_FOUND: "You have not placed any order yet",
  ORDER_CANNOT_BE_CANCELLED: "Cannot cancel a delivered order",
  ORDER_ALREADY_CANCELLED: "Order is already cancelled",
  INVALID_SHIPPING_DETAILS: "Shipping address details are required",
  ORDER_ITEMS_REQUIRED: "Order items are required",
  SHIPROCKET_SYNC_FAILED: "ShipRocket order creation failed",

  // Review errors
  REVIEW_ALREADY_SUBMITTED: "Review already submitted",
  INVALID_RATING: "Rating must be between 0 and 5",
  REVIEW_TITLE_TOO_SHORT: "Review title must be at least 3 characters",
  REVIEW_TITLE_TOO_LONG: "Review title cannot exceed 200 characters",
  REVIEW_TEXT_TOO_SHORT: "Review text must be at least 10 characters",
  REVIEW_TEXT_TOO_LONG: "Review text cannot exceed 5000 characters",
  INVALID_MEDIA_URL: "Media file URL must be valid",
};

const INFO_MESSAGES = {
  API_WELCOME: "DigiVahan Backend API",
  DATABASE_CONNECTING: "Connecting to database...",
  DATABASE_CONNECTED: "MongoDB Connected",
  MODELS_INITIALIZED: "Models initialized successfully",
  SERVER_STARTED: "Server running on port",
  HEALTH_CHECK: "Health check",
};

const VALIDATION_MESSAGES = {
  // Field validation
  VALIDATION_FAILED: "Field is Missing",

  // Name validation
  NAME_LENGTH: "Name must be between 2 and 50 characters",
  NAME_PATTERN: "Name can only contain letters and spaces",
  FIRST_NAME_REQUIRED: "First name is required",
  FIRST_NAME_LENGTH: "First name must be between 2 and 50 characters",
  FIRST_NAME_PATTERN: "First name can only contain letters and spaces",
  LAST_NAME_REQUIRED: "Last name is required",
  LAST_NAME_LENGTH: "Last name must be between 2 and 50 characters",
  LAST_NAME_PATTERN: "Last name can only contain letters and spaces",

  // Email validation
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Please provide a valid email address",
  EMAIL_NORMALIZE: "Email will be normalized to lowercase",

  // Phone validation
  PHONE_REQUIRED: "Phone number is required",
  PHONE_INVALID: "Please provide a valid phone number",
  PHONE_LENGTH: "Please provide a valid 10-digit phone number",

  // Password validation
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_LENGTH: "Password must be at least {min} characters long",
  PASSWORD_PATTERN:
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",

  // OTP validation
  OTP_REQUIRED: "OTP is required",
  OTP_LENGTH: "OTP must be between 4 and 8 characters",
  OTP_NUMERIC: "OTP must contain only numbers",

  // Temp user ID validation
  TEMP_USER_ID_REQUIRED: "Temp user ID is required",
  TEMP_USER_ID_LENGTH: "Temp user ID must be between 10 and 50 characters",

  // Login validation
  LOGIN_VALUE_REQUIRED: "Login value is required",
  LOGIN_TYPE_REQUIRED: "Login type is required",
  LOGIN_VIA_REQUIRED: "Login via is required",

  // Identifier validation
  IDENTIFIER_REQUIRED: "Identifier is required",

  // OTP channel validation
  OTP_CHANNEL_REQUIRED: "OTP channel is required",
  OTP_CHANNEL_INVALID: "OTP channel must be either 'email' or 'phone'",

  // User verification validation
  MEDIUM_INVALID: "Medium must be either 'email' or 'phone'",
  VALUE_REQUIRED: "Value is required",
  VERIFICATION_ID_REQUIRED: "Verification ID is required",
  VERIFICATION_ID_LENGTH: "Verification ID must be between 6 and 20 characters",

  // Generic validation messages
  REQUIRED_FIELD: "{field} is required",
  FIELD_LENGTH_MAX: "{field} must not exceed {max} characters",
  FIELD_NUMERIC: "{field} must be a valid number",
  FIELD_NUMERIC_MIN: "{field} must be at least {min}",
  FIELD_NUMERIC_MAX: "{field} must not exceed {max}",
  FIELD_BOOLEAN: "{field} must be a boolean value",

  // App Keys validation messages
  HIT_BY_REQUIRED: "hit_by is required",
  HIT_BY_INVALID: "hit_by must be either 'user' or 'server'",
  ONE_SIGNAL_ID_LENGTH: "one_signal_id must be between 1 and 100 characters",
  APP_VERSION_LENGTH: "app_version must be between 1 and 20 characters",

  // Device Data validation messages
  DEVICE_HIT_TYPE_REQUIRED: "hit_type is required",
  DEVICE_HIT_TYPE_INVALID: "hit_type must be either 'add' or 'remove'",
  USER_ID_REQUIRED: "user_id is required",
  USER_ID_LENGTH: "user_id must be between 1 and 100 characters",
  UUID_REQUIRED: "uuid is required",
  UUID_LENGTH: "uuid must be between 10 and 100 characters",
  DEVICE_NAME_LENGTH: "device_name must be between 1 and 100 characters",
  DEVICE_VERSION_LENGTH: "device_version must be between 1 and 50 characters",
  DEVICE_MODEL_LENGTH: "device_model must be between 1 and 100 characters",
  PLAYER_ID_LENGTH: "player_id must be between 1 and 100 characters",

  // Emergency Contact validation
  EMERGENCY_CONTACT_ID_REQUIRED: "Required contact id",
  CONTACT_ID_LENGTH: "contact_id must be between 1 and 100 characters",

  // User suspension validation messages
  USER_ID_REQUIRED_SUSPEND: "user_id is required for suspension",
  SUSPEND_UNTIL_REQUIRED: "suspend_until is required",
  SUSPEND_UNTIL_INVALID: "suspend_until must be a valid future date",
  REASON_REQUIRED: "reason is required",
  REASON_LENGTH: "reason must be between 5 and 500 characters",

  // Email validation messages
  SENDER_REQUIRED: "sender is required",
  SENDER_INVALID: "sender must be a valid registered email address",
  TO_REQUIRED: "to is required",
  TO_INVALID: "to must be a valid email address",
  SUBJECT_REQUIRED: "subject is required",
  SUBJECT_LENGTH: "subject must be between 1 and 200 characters",
  BODY_REQUIRED: "body is required",
  BODY_INVALID: "body must be a valid template identifier",
  SIGNATURE_REQUIRED: "signature is required",
  SIGNATURE_INVALID: "signature must be an object",
  ATTACHMENTS_INVALID: "attachments must be an array",

  // QR Code validation messages
  GENERER_ID_REQUIRED: "generer_id is required",
  GENERER_ID_LENGTH: "generer_id must be between 1 and 100 characters",
  QR_UNIT_REQUIRED: "qr_unit is required",
  QR_UNIT_INVALID: "qr_unit must be a valid number",
  GENERATED_BY_REQUIRED: "genreated_by is required",
  GENERATED_BY_LENGTH: "genreated_by must be between 1 and 50 characters",

  // QR Assignment validation messages
  QR_ID_REQUIRED: "qr_id is required",
  QR_ID_LENGTH: "qr_id must be between 1 and 100 characters",
  VEHICLE_ID_REQUIRED: "vehicle_id is required",
  VEHICLE_ID_LENGTH: "vehicle_id must be between 1 and 50 characters",
  ASSIGNED_BY_REQUIRED: "assigend_by is required",
  ASSIGNED_BY_INVALID: "assigend_by must be either 'user' or 'sales'",
  USER_ID_REQUIRED_ASSIGN: "user_id is required when assigned_by is 'user'",
  SALES_ID_REQUIRED: "sales_id is required when assigned_by is 'sales'",

  // Fuel Price validation messages
  STATE_REQUIRED: "state is required",
  STATE_LENGTH: "state must be between 2 and 50 characters",
  STATE_FORMAT: "state must contain only uppercase letters and underscores",
  PETROL_PRICE_INVALID: "petrol_price must be a valid number",
  PETROL_PRICE_NEGATIVE: "petrol_price cannot be negative",
  PETROL_PRICE_TOO_HIGH: "petrol_price cannot exceed 1000",
  DIESEL_PRICE_INVALID: "diesel_price must be a valid number",
  DIESEL_PRICE_NEGATIVE: "diesel_price cannot be negative",
  DIESEL_PRICE_TOO_HIGH: "diesel_price cannot exceed 1000",
  CNG_PRICE_INVALID: "cng_price must be a valid number",
  CNG_PRICE_NEGATIVE: "cng_price cannot be negative",
  CNG_PRICE_TOO_HIGH: "cng_price cannot exceed 1000",

  // Garage validation messages
  VEHICLE_NUMBER_REQUIRED: "vehicle_number is required",
  VEHICLE_NUMBER_INVALID:
    "vehicle_number must be in valid format (e.g., UP32AB1234)",

  // Trending Cars validation messages
  HIT_TYPE_REQUIRED: "hit_type is required",
  HIT_TYPE_INVALID: "hit_type must be 'add', 'delete', or 'fetch'",
  CAR_ID_REQUIRED: "car_id is required",
  CAR_ID_LENGTH: "car_id must be between 1 and 50 characters",

  // Vehicle Comparison validation messages
  COMPARISON_ID_REQUIRED: "comparison_id is required",
  COMPARISON_ID_LENGTH: "comparison_id must be between 1 and 50 characters",

  // Tips and Tricks validation messages
  TIP_ID_REQUIRED: "tip_id is required",
  TIP_ID_LENGTH: "tip_id must be between 1 and 50 characters",

  // News validation messages
  NEWS_BANNER_REQUIRED: "banner is required",
  NEWS_BANNER_LENGTH: "banner must be between 1 and 500 characters",
  NEWS_TYPE_REQUIRED: "news_type is required",
  NEWS_TYPE_INVALID:
    "news_type must be one of: automotive, technology, safety, environment, business, government, general, breaking, featured",
  NEWS_HEADING_REQUIRED: "heading is required",
  NEWS_HEADING_LENGTH: "heading must be between 1 and 200 characters",
  NEWS_CONTENT_REQUIRED: "news content is required",
  NEWS_CONTENT_LENGTH: "news content must be between 1 and 10000 characters",
  NEWS_ID_REQUIRED: "news_id is required",
  NEWS_ID_LENGTH: "news_id must be between 1 and 50 characters",

  // Pagination validation messages
  LIMIT_INVALID: "limit must be a number between 1 and 100",
  PAGE_INVALID: "page must be a positive number",
  SKIP_INVALID: "skip must be a non-negative number",

  // QR Videos validation messages
  TUTORIAL_VIDEO_ID_REQUIRED: "tutorial_video_id is required",
  TUTORIAL_VIDEO_ID_LENGTH:
    "tutorial_video_id must be between 1 and 50 characters",
  VIDEO_TITLE_LENGTH: "title must be between 1 and 200 characters",
  TUTORIAL_VIDEO_LENGTH: "tutorial_video must be between 1 and 500 characters",
  TUTORIAL_THUMBNAIL_LENGTH:
    "tutorial_thumbnail must be between 1 and 500 characters",
};

module.exports = {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  INFO_MESSAGES,
  VALIDATION_MESSAGES,
};
