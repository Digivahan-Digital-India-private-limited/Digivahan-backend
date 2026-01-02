/**
 * Enum Constants
 * Centralized definition of all enums used throughout the application
 */

const OTP_CHANNEL = {
  EMAIL: "EMAIL",
  PHONE: "PHONE",
};

const HIT_TYPE = {
  CHECK: "check",
  REGISTER: "register",
};

const LOGIN_TYPE = {
  EMAIL: "email",
  PHONE: "phone",
};

const LOGIN_VIA = {
  EMAIL: "email",
  PHONE: "phone",
};

const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  EMPTY: "",
};

const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  SUSPENDED: "suspended",
};

const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING_DELETION: "PENDING_DELETION",
  DELETED: "DELETED",
  SUSPENDED: "SUSPENDED",
};

const DELETION_TYPE = {
  ALL: "all",
  STATUS: "status",
};

const DELETION_STATUS = {
  PENDING_DELETION: "PENDING_DELETION",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
};

const QR_ID_STATUS = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
};

const VERIFICATION_STATUS = {
  VERIFIED: true,
  UNVERIFIED: false,
};

const TRACKING_STATUS = {
  ON: true,
  OFF: false,
};

const NOTIFICATION_TYPE = {
  SYSTEM: "system",
  VEHICLE: "vehicle",
  ORDER: "order",
  SECURITY: "security",
  PROMOTION: "promotion",
};

const VEHICLE_CLASS = {
  TWO_WHEELER: "two_wheeler",
  THREE_WHEELER: "three_wheeler",
  FOUR_WHEELER: "four_wheeler",
  COMMERCIAL: "commercial",
  HEAVY_VEHICLE: "heavy_vehicle",
};

const FUEL_TYPE = {
  PETROL: "petrol",
  DIESEL: "diesel",
  ELECTRIC: "electric",
  HYBRID: "hybrid",
  CNG: "cng",
  LPG: "lpg",
};

const INSURANCE_TYPE = {
  COMPREHENSIVE: "comprehensive",
  THIRD_PARTY: "third_party",
  ZERO_DEP: "zero_dep",
};

const RC_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  PENDING: "pending",
  SUSPENDED: "suspended",
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

const RESPONSE_STATUS = {
  SUCCESS: "success",
  ERROR: "error",
  TRUE: true,
  FALSE: false,
};

const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  MAX_DAILY_ATTEMPTS: 3,
};

const PASSWORD_CONFIG = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: false,
  MAX_OLD_PASSWORDS: 4,
};

const JWT_CONFIG = {
  EXPIRY_DAYS: 7,
  ALGORITHM: "HS256",
};

const HIT_BY = {
  USER: "user",
  SERVER: "server",
};

const DEVICE_HIT_TYPE = {
  ADD: "add",
  REMOVE: "remove",
};

const FILE_UPLOAD_TYPE = {
  SINGLE: "single",
  MULTIPLE: "multiple",
  PROFILE_IMAGE: "profile_image",
  VEHICLE_DOCUMENT: "vehicle_document",
};

const DOCUMENT_TYPE = {
  REGISTRATION: "registration",
  INSURANCE: "insurance",
  POLLUTION: "pollution",
  FITNESS: "fitness",
  PERMIT: "permit",
  OTHER: "other",
};

const FILE_STATUS = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  FAILED: "failed",
  DELETED: "deleted",
};

const UPLOAD_FOLDER = {
  UPLOADS: "uploads",
  IMAGES: "images",
  DOCUMENTS: "documents",
  PROFILE_IMAGES: "profile-images",
  VEHICLE_DOCUMENTS: "vehicle-documents",
};

const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    LENGTH: 10,
    PATTERN: /^[0-9]{10}$/,
  },
  OTP: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 8,
    PATTERN: /^[0-9]+$/,
  },
  TEMP_USER_ID: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 50,
  },
  USER_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  UUID: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 100,
  },
  DEVICE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  DEVICE_VERSION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  DEVICE_MODEL: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  APP_VERSION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
  },
  PLAYER_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  ONE_SIGNAL_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  FILE_ID: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 200,
  },
  FILE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  FOLDER_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  VEHICLE_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  FILE_SIZE: {
    MAX_GENERAL: 10 * 1024 * 1024, // 10MB
    MAX_IMAGE: 5 * 1024 * 1024, // 5MB
    MAX_DOCUMENT: 15 * 1024 * 1024, // 15MB
  },
};

module.exports = {
  OTP_CHANNEL,
  HIT_TYPE,
  LOGIN_TYPE,
  LOGIN_VIA,
  GENDER,
  USER_STATUS,
  ACCOUNT_STATUS,
  DELETION_TYPE,
  DELETION_STATUS,
  QR_ID_STATUS,
  VERIFICATION_STATUS,
  TRACKING_STATUS,
  NOTIFICATION_TYPE,
  VEHICLE_CLASS,
  FUEL_TYPE,
  INSURANCE_TYPE,
  RC_STATUS,
  HTTP_STATUS,
  RESPONSE_STATUS,
  OTP_CONFIG,
  PASSWORD_CONFIG,
  JWT_CONFIG,
  HIT_BY,
  DEVICE_HIT_TYPE,
  FILE_UPLOAD_TYPE,
  DOCUMENT_TYPE,
  FILE_STATUS,
  UPLOAD_FOLDER,
  VALIDATION_RULES,
};
