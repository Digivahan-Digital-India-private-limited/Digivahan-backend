const { validationResult } = require("express-validator");
const {
  VALIDATION_RULES,
  OTP_CHANNEL,
  HIT_TYPE,
  LOGIN_TYPE,
  LOGIN_VIA,
  HTTP_STATUS,
  RESPONSE_STATUS,
  VALIDATION_MESSAGES,
} = require("../../constants");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: RESPONSE_STATUS.FALSE,
      message: VALIDATION_MESSAGES.VALIDATION_FAILED,
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }

  next();
};

// Common validation rules
const commonValidations = {
  // Email validation
  email: (field = "email") => {
    const { body } = require("express-validator");
    return body(field)
      .isEmail()
      .withMessage(VALIDATION_MESSAGES.EMAIL_INVALID)
      .normalizeEmail({
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false,
      });
  },

  // Password validation
  password: (field = "password") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(
        VALIDATION_MESSAGES.REQUIRED_FIELD.replace("{field}", field)
      );
  },

  // Name validation
  name: (field = "name") => {
    const { body } = require("express-validator");
    return body(field)
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage(VALIDATION_MESSAGES.NAME_LENGTH)
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage(VALIDATION_MESSAGES.NAME_PATTERN);
  },

  // Phone number validation
  phone: (field = "phone") => {
    const { body } = require("express-validator");
    return body(field)
      .isMobilePhone()
      .withMessage(VALIDATION_MESSAGES.PHONE_INVALID);
  },

  // Required field validation
  required: (field, fieldName) => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(
        VALIDATION_MESSAGES.REQUIRED_FIELD.replace("{field}", fieldName)
      )
      .trim();
  },

  // Optional string validation
  optionalString: (field, maxLength = 255) => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ max: maxLength })
      .withMessage(
        VALIDATION_MESSAGES.FIELD_LENGTH_MAX.replace("{field}", field).replace(
          "{max}",
          maxLength
        )
      )
      .trim();
  },

  // Number validation
  number: (field, min = null, max = null) => {
    const { body } = require("express-validator");
    let validation = body(field)
      .isNumeric()
      .withMessage(VALIDATION_MESSAGES.FIELD_NUMERIC.replace("{field}", field));

    if (min !== null) {
      validation = validation
        .isFloat({ min })
        .withMessage(
          VALIDATION_MESSAGES.FIELD_NUMERIC_MIN.replace(
            "{field}",
            field
          ).replace("{min}", min)
        );
    }

    if (max !== null) {
      validation = validation
        .isFloat({ max })
        .withMessage(
          VALIDATION_MESSAGES.FIELD_NUMERIC_MAX.replace(
            "{field}",
            field
          ).replace("{max}", max)
        );
    }

    return validation;
  },

  // Boolean validation
  boolean: (field) => {
    const { body } = require("express-validator");
    return body(field)
      .isBoolean()
      .withMessage(VALIDATION_MESSAGES.FIELD_BOOLEAN.replace("{field}", field));
  },

  // OTP validation
  otp: (field = "otp") => {
    const { body } = require("express-validator");
    return body(field)
      .isLength({ min: 4, max: 8 })
      .withMessage(VALIDATION_MESSAGES.OTP_LENGTH)
      .isNumeric()
      .withMessage(VALIDATION_MESSAGES.OTP_NUMERIC);
  },

  // First name validation
  firstName: (field = "first_name") => {
    const { body } = require("express-validator");
    return body(field)
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage(VALIDATION_MESSAGES.FIRST_NAME_LENGTH)
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage(VALIDATION_MESSAGES.FIRST_NAME_PATTERN);
  },

  // Last name validation
  lastName: (field = "last_name") => {
    const { body } = require("express-validator");
    return body(field)
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage(VALIDATION_MESSAGES.LAST_NAME_LENGTH)
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage(VALIDATION_MESSAGES.LAST_NAME_PATTERN);
  },

  // OTP channel validation
  otpChannel: (field = "otp_channel") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn([OTP_CHANNEL.EMAIL, OTP_CHANNEL.PHONE, "email", "phone"])
      .withMessage(VALIDATION_MESSAGES.OTP_CHANNEL_INVALID)
      .customSanitizer((value) => {
        // Convert to uppercase for consistency
        return value ? value.toUpperCase() : value;
      });
  },

  // Temp user ID validation
  tempUserId: (field = "temp_user_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.TEMP_USER_ID_REQUIRED)
      .isLength({ min: 10, max: 50 })
      .withMessage(VALIDATION_MESSAGES.TEMP_USER_ID_LENGTH);
  },

  // Login type validation
  loginType: (field = "login_type") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn([LOGIN_TYPE.EMAIL, LOGIN_TYPE.PHONE])
      .withMessage(VALIDATION_MESSAGES.LOGIN_TYPE_REQUIRED);
  },

  // Login via validation
  loginVia: (field = "login_via") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn([LOGIN_VIA.EMAIL, LOGIN_VIA.PHONE])
      .withMessage(VALIDATION_MESSAGES.LOGIN_VIA_REQUIRED);
  },

  // Login value validation (email or phone)
  loginValue: (field = "login_value") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.LOGIN_VALUE_REQUIRED)
      .custom((value, { req }) => {
        // Check if it's an email or phone based on the request body
        const loginType = req.body.login_type || req.body.login_via;

        if (loginType === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
          }
        } else if (loginType === "phone") {
          const phoneRegex = /^[0-9]{10}$/;
          if (!phoneRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.PHONE_LENGTH);
          }
        }

        return true;
      });
  },

  // Identifier validation (email or phone)
  identifier: (field = "identifier") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.IDENTIFIER_REQUIRED)
      .custom((value, { req }) => {
        // Check if it's an email or phone based on the request body
        const otpChannel = req.body.otp_channel;

        if (otpChannel === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
          }
        } else if (otpChannel === "phone") {
          const phoneRegex = /^[0-9]{10}$/;
          if (!phoneRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.PHONE_LENGTH);
          }
        }

        return true;
      });
  },

  // Medium validation for user verification
  medium: (field = "medium") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn(["email", "phone"])
      .withMessage(VALIDATION_MESSAGES.MEDIUM_INVALID);
  },

  // Value validation for user verification (email or phone based on medium)
  value: (field = "value") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.VALUE_REQUIRED)
      .custom((value, { req }) => {
        const medium = req.body.medium;

        if (medium === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
          }
        } else if (medium === "phone") {
          const phoneRegex = /^[0-9]{10}$/;
          if (!phoneRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.PHONE_LENGTH);
          }
        }

        return true;
      });
  },

  // Verification ID validation
  verificationId: (field = "verificationId") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.VERIFICATION_ID_REQUIRED)
      .isLength({ min: 6, max: 200 })
      .withMessage(VALIDATION_MESSAGES.VERIFICATION_ID_LENGTH);
  },

  // API hit type validation (optional)
  apiHitType: (field = "api_hit_type") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isIn(["check_user_exists"])
      .withMessage("api_hit_type must be 'check_user_exists' when provided");
  },

  // Hit type validation for register user
  hitTypeRegisterUser: (field = "hit_type") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn([HIT_TYPE.CHECK, HIT_TYPE.REGISTER])
      .withMessage(VALIDATION_MESSAGES.INVALID_HIT_TYPE);
  },

  // Hit by validation
  hitBy: (field = "hit_by") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn(["user", "server"])
      .withMessage(VALIDATION_MESSAGES.HIT_BY_INVALID);
  },

  // Device hit type validation
  deviceHitType: (field = "hit_type") => {
    const { body } = require("express-validator");
    return body(field)
      .isIn(["add", "remove"])
      .withMessage(VALIDATION_MESSAGES.DEVICE_HIT_TYPE_INVALID);
  },

  // User ID validation
  userId: (field = "user_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.USER_ID_REQUIRED)
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.USER_ID_LENGTH);
  },

  // Sender ID validation
  senderId: (field = "sender_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("Sender_Id is Required! ")
      .isLength({ min: 1, max: 100 })
      .withMessage("sender_id must be between 1 and 100 characters");
  },

  // Sender ID validation
  receiverId: (field = "receiver_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("Receiver_id is Required! ")
      .isLength({ min: 1, max: 100 })
      .withMessage("receiver_id must be between 1 and 100 characters");
  },

   unitno: (field = "unit") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("unit is required")
      .isLength({ min: 1, max: 50 })
      .withMessage("unit must be a number between 1 and 50");
  },

  // User ID validation
  orderId: (field = "order_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("Order Id is Required To fetch the Details of order")
      .isLength({ min: 1, max: 100 })
      .withMessage("order_id must be between 1 and 100 characters");
  },

  validateDeliveryPostcode: (field = "delivery_postcode") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("Delivery postcode is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("Delivery postcode must be exactly 6 digits")
      .isNumeric()
      .withMessage("Delivery postcode must contain only numbers");
  },

  // Document Type validation
  docType: (field = "doc_type") => {
    const { body } = require("express-validator");

    return body(field)
      .notEmpty()
      .withMessage("Document type is required")
      .isIn(["aadhar", "polution", "insurance", "rc"])
      .withMessage("Invalid document type");
  },

  // Product Type validation
  productType: (field = "product_type") => {
    const { body } = require("express-validator");

    return body(field)
      .notEmpty()
      .withMessage("Product type is required")
      .isIn(["app", "vehicle", "service", "other"])
      .withMessage("Invalid product type");
  },

  // Contact ID validation
  contactId: (field = "contact_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.EMERGENCY_CONTACT_ID_REQUIRED)
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.CONTACT_ID_LENGTH);
  },

  addressId: (field = "address_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("address id is Required")
      .isLength({ min: 1, max: 100 })
      .withMessage("user_id must be between 1 and 100 characters");
  },

  // User Set-Primary validation
  setprimary: (field = "set_primary") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("set primary contact is required [Phone, Email]");
  },

  // OTP validation
  OTP: (field = "otp") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage("OTP is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be exactly 6 digits");
  },

  // UUID validation
  uuid: (field = "uuid") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.UUID_REQUIRED)
      .isLength({ min: 10, max: 100 })
      .withMessage(VALIDATION_MESSAGES.UUID_LENGTH);
  },

  // Device name validation
  deviceName: (field = "device_name") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.DEVICE_NAME_LENGTH);
  },

  // Device version validation
  deviceVersion: (field = "device_version") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.DEVICE_VERSION_LENGTH);
  },

  // Device model validation
  deviceModel: (field = "device_model") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.DEVICE_MODEL_LENGTH);
  },

  // App version validation (for device data)
  deviceAppVersion: (field = "app_version") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage(VALIDATION_MESSAGES.APP_VERSION_LENGTH);
  },

  // Player ID validation
  playerId: (field = "player_id") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.PLAYER_ID_LENGTH);
  },

  // One Signal ID validation
  oneSignalId: (field = "one_signal_id") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.ONE_SIGNAL_ID_LENGTH);
  },

  // App version validation (for app keys)
  appKeysAppVersion: (field = "app_version") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage(VALIDATION_MESSAGES.APP_VERSION_LENGTH);
  },

  // User register ID validation
  userRegisterId: (field = "user_register_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.INVALID_USER_REGISTER_ID)
      .isLength({ min: 10, max: 50 })
      .withMessage(VALIDATION_MESSAGES.TEMP_USER_ID_LENGTH);
  },

  // Forget with validation (email or phone)
  forgetWith: (field = "forget_with") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(
        VALIDATION_MESSAGES.REQUIRED_FIELD.replace("{field}", "forget_with")
      )
      .custom((value, { req }) => {
        // Check if it's an email or phone based on the request body
        const otpChannel = req.body.otp_channel;

        if (otpChannel === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
          }
        } else if (otpChannel === "phone") {
          const phoneRegex = /^[0-9]{10}$/;
          if (!phoneRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.PHONE_LENGTH);
          }
        }

        return true;
      });
  },

  // Verify to validation (email or phone)
  verifyTo: (field = "verify_to") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(
        VALIDATION_MESSAGES.REQUIRED_FIELD.replace("{field}", "verify_to")
      )
      .custom((value, { req }) => {
        // Check if it's an email or phone based on the request body
        const otpChannel = req.body.otp_channel;

        if (otpChannel === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
          }
        } else if (otpChannel === "phone") {
          const phoneRegex = /^[0-9]{10}$/;
          if (!phoneRegex.test(value)) {
            throw new Error(VALIDATION_MESSAGES.PHONE_LENGTH);
          }
        }

        return true;
      });
  },

  // User ID validation for suspension (email or phone)
  userIdForSuspension: (field = "user_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.USER_ID_REQUIRED_SUSPEND)
      .custom((value) => {
        // Check if it's an email or phone number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10}$/;

        if (!emailRegex.test(value) && !phoneRegex.test(value)) {
          throw new Error(
            "user_id must be a valid email address or 10-digit phone number"
          );
        }
        return true;
      });
  },

  // Suspend until validation
  suspendUntil: (field = "suspend_until") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.SUSPEND_UNTIL_REQUIRED)
      .isISO8601()
      .withMessage(VALIDATION_MESSAGES.SUSPEND_UNTIL_INVALID)
      .custom((value) => {
        const suspendDate = new Date(value);
        const now = new Date();

        if (suspendDate <= now) {
          throw new Error(VALIDATION_MESSAGES.SUSPENSION_DATE_PAST);
        }

        return true;
      });
  },

  // Reason validation
  suspensionReason: (field = "reason") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.REASON_REQUIRED)
      .isLength({ min: 5, max: 500 })
      .withMessage(VALIDATION_MESSAGES.REASON_LENGTH)
      .trim();
  },

  // User ID validation for removing suspension (email or phone)
  userIdForRemoveSuspension: (field = "user_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.USER_ID_REQUIRED_SUSPEND)
      .custom((value) => {
        // Check if it's an email or phone number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10}$/;

        if (!emailRegex.test(value) && !phoneRegex.test(value)) {
          throw new Error(
            "user_id must be a valid email address or 10-digit phone number"
          );
        }
        return true;
      });
  },

  // Define the reason for deletion
  deletionReason: (field = "reason") => {
    const { body } = require("express-validator");

    return body(field)
      .notEmpty()
      .withMessage("Reason is required")
      .isString()
      .withMessage("Reason must be a valid text message")
      .isLength({ min: 3 })
      .withMessage("Reason must be at least 3 characters long");
  },

  // Email sender validation
  emailSender: (field = "sender") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.SENDER_REQUIRED)
      .isEmail()
      .withMessage(VALIDATION_MESSAGES.SENDER_INVALID)
      .custom((value) => {
        // Check if sender is in the registered senders list
        const senders = require("../../config/senders.json");
        if (!senders[value]) {
          throw new Error(VALIDATION_MESSAGES.SENDER_INVALID);
        }
        return true;
      });
  },

  // Email recipient validation
  emailRecipient: (field = "to") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.TO_REQUIRED)
      .isEmail()
      .withMessage(VALIDATION_MESSAGES.TO_INVALID);
  },

  // Email subject validation
  emailSubject: (field = "subject") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.SUBJECT_REQUIRED)
      .isLength({ min: 1, max: 200 })
      .withMessage(VALIDATION_MESSAGES.SUBJECT_LENGTH)
      .trim();
  },

  // Email body (template) validation
  emailBody: (field = "body") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.BODY_REQUIRED)
      .custom((value) => {
        // Check if template exists
        const fs = require("fs");
        const path = require("path");
        const templatePath = path.join(
          __dirname,
          "../templates",
          `${value}.html`
        );
        if (!fs.existsSync(templatePath)) {
          throw new Error(VALIDATION_MESSAGES.BODY_INVALID);
        }
        return true;
      });
  },

  // Email signature validation
  emailSignature: (field = "signature") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.SIGNATURE_REQUIRED)
      .isObject()
      .withMessage(VALIDATION_MESSAGES.SIGNATURE_INVALID);
  },

  // Email attachments validation
  emailAttachments: (field = "attachments") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isArray()
      .withMessage(VALIDATION_MESSAGES.ATTACHMENTS_INVALID);
  },

  // QR Code generer_id validation
  qrGenererId: (field = "generer_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.GENERER_ID_REQUIRED)
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.GENERER_ID_LENGTH)
      .trim();
  },

  // QR Code qr_unit validation
  qrUnit: (field = "qr_unit") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.QR_UNIT_REQUIRED)
      .isNumeric()
      .withMessage(VALIDATION_MESSAGES.QR_UNIT_INVALID)
      .custom((value) => {
        const num = parseInt(value);
        if (num <= 0 || num > 100) {
          throw new Error("qr_unit must be between 1 and 100");
        }
        return true;
      });
  },

  // QR Code generated_by validation
  qrGeneratedBy: (field = "genreated_by") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.GENERATED_BY_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.GENERATED_BY_LENGTH)
      .trim();
  },

  // QR Assignment qr_id validation
  qrAssignmentId: (field = "qr_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.QR_ID_REQUIRED)
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.QR_ID_LENGTH)
      .trim();
  },

  // QR Assignment vehicle_id validation
  qrVehicleId: (field = "vehicle_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.VEHICLE_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.VEHICLE_ID_LENGTH)
      .trim();
  },

  // QR Assignment assigned_by validation
  qrAssignedBy: (field = "assigend_by") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.ASSIGNED_BY_REQUIRED)
      .isIn(["user", "sales"])
      .withMessage(VALIDATION_MESSAGES.ASSIGNED_BY_INVALID);
  },

  // QR Assignment user_id validation (conditional)
  qrUserId: (field = "user_id") => {
    const { body } = require("express-validator");
    return body(field)
      .custom((value, { req }) => {
        if (req.body.assigend_by === "user" && !value) {
          throw new Error(VALIDATION_MESSAGES.USER_ID_REQUIRED_ASSIGN);
        }
        if (value && typeof value !== "string") {
          throw new Error("user_id must be a string");
        }
        return true;
      })
      .optional()
      .trim();
  },

  // QR Assignment sales_id validation (conditional)
  qrSalesId: (field = "sales_id") => {
    const { body } = require("express-validator");
    return body(field)
      .custom((value, { req }) => {
        if (req.body.assigend_by === "sales" && !value) {
          throw new Error(VALIDATION_MESSAGES.SALES_ID_REQUIRED);
        }
        if (value && typeof value !== "string") {
          throw new Error("sales_id must be a string");
        }
        return true;
      })
      .optional()
      .trim();
  },

  // Fuel Price state validation
  fuelState: (field = "state") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.STATE_REQUIRED)
      .isLength({ min: 2, max: 50 })
      .withMessage(VALIDATION_MESSAGES.STATE_LENGTH)
      .matches(/^[A-Z_]+$/)
      .withMessage(VALIDATION_MESSAGES.STATE_FORMAT)
      .trim();
  },

  // Fuel Price state parameter validation (for URL params)
  fuelStateParam: (field = "state") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.STATE_REQUIRED)
      .isLength({ min: 2, max: 50 })
      .withMessage(VALIDATION_MESSAGES.STATE_LENGTH)
      .matches(/^[A-Z_]+$/)
      .withMessage(VALIDATION_MESSAGES.STATE_FORMAT)
      .trim();
  },

  // Fuel Price petrol price validation
  fuelPetrolPrice: (field = "petrol_price") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .custom((value) => {
        if (value !== undefined && value !== null && value !== "") {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error(VALIDATION_MESSAGES.PETROL_PRICE_INVALID);
          }
          if (numValue < 0) {
            throw new Error(VALIDATION_MESSAGES.PETROL_PRICE_NEGATIVE);
          }
          if (numValue > 1000) {
            throw new Error(VALIDATION_MESSAGES.PETROL_PRICE_TOO_HIGH);
          }
        }
        return true;
      });
  },

  // Fuel Price diesel price validation
  fuelDieselPrice: (field = "diesel_price") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .custom((value) => {
        if (value !== undefined && value !== null && value !== "") {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error(VALIDATION_MESSAGES.DIESEL_PRICE_INVALID);
          }
          if (numValue < 0) {
            throw new Error(VALIDATION_MESSAGES.DIESEL_PRICE_NEGATIVE);
          }
          if (numValue > 1000) {
            throw new Error(VALIDATION_MESSAGES.DIESEL_PRICE_TOO_HIGH);
          }
        }
        return true;
      });
  },

  // Fuel Price CNG price validation
  fuelCngPrice: (field = "cng_price") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .custom((value) => {
        if (value !== undefined && value !== null && value !== "") {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error(VALIDATION_MESSAGES.CNG_PRICE_INVALID);
          }
          if (numValue < 0) {
            throw new Error(VALIDATION_MESSAGES.CNG_PRICE_NEGATIVE);
          }
          if (numValue > 1000) {
            throw new Error(VALIDATION_MESSAGES.CNG_PRICE_TOO_HIGH);
          }
        }
        return true;
      });
  },

  // Vehicle number validation
  vehicleNumber: (field = "vehicle_number") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.VEHICLE_NUMBER_REQUIRED)
      .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/)
      .withMessage(VALIDATION_MESSAGES.VEHICLE_NUMBER_INVALID)
      .trim();
  },

  // User ID parameter validation (for URL params)
  userIdParam: (field = "user_id") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.USER_ID_REQUIRED)
      .isLength({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.USER_ID_LENGTH);
  },

  // Hit type validation for trending cars
  hitType: (field = "hit_type") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.HIT_TYPE_REQUIRED)
      .isIn(["add", "delete", "fetch"])
      .withMessage(VALIDATION_MESSAGES.HIT_TYPE_INVALID)
      .trim();
  },

  // Car ID parameter validation (for URL params)
  carIdParam: (field = "car_id") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.CAR_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.CAR_ID_LENGTH);
  },

  // Car ID validation (for request body)
  carId: (field = "car_id") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.CAR_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.CAR_ID_LENGTH);
  },

  // Optional Car ID validation (for request body)
  optionalCarId: (field = "car_id") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.CAR_ID_LENGTH);
  },

  // Comparison ID parameter validation (for URL params)
  comparisonIdParam: (field = "comparison_id") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.COMPARISON_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.COMPARISON_ID_LENGTH);
  },

  // Tip ID parameter validation (for URL params)
  tipIdParam: (field = "tip_id") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.TIP_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.TIP_ID_LENGTH);
  },

  // Optional Tip ID validation (for request body)
  optionalTipId: (field = "tip_id") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.TIP_ID_LENGTH);
  },

  // News Banner validation
  newsBanner: (field = "banner") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.NEWS_BANNER_REQUIRED)
      .isLength({ min: 1, max: 500 })
      .withMessage(VALIDATION_MESSAGES.NEWS_BANNER_LENGTH);
  },

  // Optional News Banner validation
  optionalNewsBanner: (field = "banner") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage(VALIDATION_MESSAGES.NEWS_BANNER_LENGTH);
  },

  // News Type validation
  newsType: (field = "news_type") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.NEWS_TYPE_REQUIRED)
      .isIn([
        "automotive",
        "technology",
        "safety",
        "environment",
        "business",
        "government",
        "general",
        "breaking",
        "featured",
      ])
      .withMessage(VALIDATION_MESSAGES.NEWS_TYPE_INVALID);
  },

  // Optional News Type validation
  optionalNewsType: (field = "news_type") => {
    const { body, query } = require("express-validator");
    return [
      body(field)
        .optional()
        .isIn([
          "automotive",
          "technology",
          "safety",
          "environment",
          "business",
          "government",
          "general",
          "breaking",
          "featured",
        ])
        .withMessage(VALIDATION_MESSAGES.NEWS_TYPE_INVALID),
      query(field)
        .optional()
        .isIn([
          "automotive",
          "technology",
          "safety",
          "environment",
          "business",
          "government",
          "general",
          "breaking",
          "featured",
        ])
        .withMessage(VALIDATION_MESSAGES.NEWS_TYPE_INVALID),
    ];
  },

  // News Heading validation
  newsHeading: (field = "heading") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.NEWS_HEADING_REQUIRED)
      .isLength({ min: 1, max: 200 })
      .withMessage(VALIDATION_MESSAGES.NEWS_HEADING_LENGTH);
  },

  // Optional News Heading validation
  optionalNewsHeading: (field = "heading") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage(VALIDATION_MESSAGES.NEWS_HEADING_LENGTH);
  },

  // News Content validation
  newsContent: (field = "news") => {
    const { body } = require("express-validator");
    return body(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.NEWS_CONTENT_REQUIRED)
      .isLength({ min: 1, max: 10000 })
      .withMessage(VALIDATION_MESSAGES.NEWS_CONTENT_LENGTH);
  },

  // Optional News Content validation
  optionalNewsContent: (field = "news") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 10000 })
      .withMessage(VALIDATION_MESSAGES.NEWS_CONTENT_LENGTH);
  },

  // News ID parameter validation (for URL params)
  newsIdParam: (field = "news_id") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.NEWS_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.NEWS_ID_LENGTH);
  },

  // News Type parameter validation (for URL params)
  newsTypeParam: (field = "news_type") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.NEWS_TYPE_REQUIRED)
      .isIn([
        "automotive",
        "technology",
        "safety",
        "environment",
        "business",
        "government",
        "general",
        "breaking",
        "featured",
      ])
      .withMessage(VALIDATION_MESSAGES.NEWS_TYPE_INVALID);
  },

  // Optional limit validation (for query params)
  optionalLimit: (field = "limit") => {
    const { query } = require("express-validator");
    return query(field)
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage(VALIDATION_MESSAGES.LIMIT_INVALID);
  },

  // Optional page validation (for query params)
  optionalPage: (field = "page") => {
    const { query } = require("express-validator");
    return query(field)
      .optional()
      .isInt({ min: 1 })
      .withMessage(VALIDATION_MESSAGES.PAGE_INVALID);
  },

  // Tutorial Video ID validation (for request body)
  optionalTutorialVideoId: (field = "tutorial_video_id") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.TUTORIAL_VIDEO_ID_LENGTH);
  },

  // Tutorial Video ID parameter validation (for URL params)
  tutorialVideoIdParam: (field = "tutorial_video_id") => {
    const { param } = require("express-validator");
    return param(field)
      .notEmpty()
      .withMessage(VALIDATION_MESSAGES.TUTORIAL_VIDEO_ID_REQUIRED)
      .isLength({ min: 1, max: 50 })
      .withMessage(VALIDATION_MESSAGES.TUTORIAL_VIDEO_ID_LENGTH);
  },

  // Video Title validation
  optionalVideoTitle: (field = "title") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage(VALIDATION_MESSAGES.VIDEO_TITLE_LENGTH);
  },

  // Tutorial Video URL validation
  optionalTutorialVideo: (field = "tutorial_video") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage(VALIDATION_MESSAGES.TUTORIAL_VIDEO_LENGTH);
  },

  // Tutorial Thumbnail validation
  optionalTutorialThumbnail: (field = "tutorial_thumbnail") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage(VALIDATION_MESSAGES.TUTORIAL_THUMBNAIL_LENGTH);
  },

  // Optional skip validation (for query params)
  optionalSkip: (field = "skip") => {
    const { query } = require("express-validator");
    return query(field)
      .optional()
      .isInt({ min: 0 })
      .withMessage(VALIDATION_MESSAGES.SKIP_INVALID);
  },

  // File upload validation
  fileUpload: (field = "file") => {
    const { body } = require("express-validator");
    return body(field).custom((value, { req }) => {
      if (!req.file) {
        throw new Error(VALIDATION_MESSAGES.NO_FILE_UPLOADED);
      }
      return true;
    });
  },

  // Multiple files upload validation
  multipleFilesUpload: (field = "files") => {
    const { body } = require("express-validator");
    return body(field).custom((value, { req }) => {
      if (!req.files || req.files.length === 0) {
        throw new Error(VALIDATION_MESSAGES.NO_FILES_UPLOADED);
      }
      return true;
    });
  },

  // File folder validation
  fileFolder: (field = "folder") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage("Folder name must be between 1 and 100 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Folder name can only contain letters, numbers, underscores, and hyphens"
      )
      .trim();
  },

  // Document type validation
  documentType: (field = "document_type") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isIn([
        "registration",
        "insurance",
        "pollution",
        "fitness",
        "permit",
        "other",
      ])
      .withMessage(
        "Document type must be one of: registration, insurance, pollution, fitness, permit, other"
      );
  },

  // Vehicle ID validation for documents
  vehicleIdForDocument: (field = "vehicle_id") => {
    const { body } = require("express-validator");
    return body(field)
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage("Vehicle ID must be between 1 and 50 characters")
      .trim();
  },

  // User ID validation (email or phone)
  userIdForDocument: (field = "user_id") => {
    const { body } = require("express-validator");
    return body(field).notEmpty().withMessage("User ID is required");
  },

  // Vehicle ID validation (vehicle number)
  vehicleIdRequired: (field = "vehicle_id") => {
    const { body } = require("express-validator");
    return body(field).notEmpty().withMessage("Vehicle ID is required");
  },

  // Doc type validation (vehicle_doc or other)
  docType: (field = "doc_type") => {
    const { body } = require("express-validator");
    return body(field).notEmpty().withMessage("Document type is required");
  },

  // Doc name validation
  docName: (field = "doc_name") => {
    const { body } = require("express-validator");
    return body(field).notEmpty().withMessage("Document name is required");
  },

  // Doc number validation (optional, required for "other" type)
  docNumber: (field = "doc_number") => {
    const { body } = require("express-validator");
    return body(field).optional();
  },
};

module.exports = {
  handleValidationErrors,
  commonValidations,
};
