const express = require("express");
const router = express.Router();
const {
  handleValidationErrors,
  commonValidations,
} = require("../middleware/validation.js");

const { authenticateToken } = require("../middleware/auth.js");

const {
  registerInit,
  checkRegisteredUser,
  verifyOtp,
  resendOtp,
  signIn,
  otpBasedLogin,
  verifyLoginOtp,
  requestResetPassword,
  verifyResetOtp,
  verifyRequest,
  verifyConfirm,
  RequestPrimaryContact,
  VerifyOTPforsetPrimaryContact,
  ChangeUserpassword,
  ValidateNewPassword,
  LogOutUser,
  suspendUser,
  removeUserSuspension,
} = require("../controllers/authController.js");
const { API_ROUTES } = require("../../constants/apiRoutes.js");

// User Registration Init - Step 1: Check user existence or collect user details and send OTP
router.post(
  API_ROUTES.AUTH.REGISTER.INIT,
  [
    commonValidations.firstName("first_name"),
    commonValidations.lastName("last_name"),
    commonValidations.email("email"),
    commonValidations.phone("phone"),
    commonValidations.password("password", 8),
    commonValidations.otpChannel("otp_channel"),
    handleValidationErrors,
  ],
  registerInit
);

router.post(
  API_ROUTES.AUTH.CHECK.INIT,
  [
    commonValidations.email("email"),
    commonValidations.phone("phone"),
    commonValidations.hitTypeRegisterUser("hit_type"),
    handleValidationErrors,
  ],
  checkRegisteredUser
);

// User Registration OTP Verification - Step 2: Verify OTP and create account
router.post(
  API_ROUTES.AUTH.REGISTER.VERIFY_OTP,
  [
    commonValidations.userRegisterId("user_register_id"),
    commonValidations.otp("otp"),
    handleValidationErrors,
  ],
  verifyOtp
);

// Resend OTP
router.post(
  API_ROUTES.AUTH.REGISTER.RESEND_OTP,
  [
    commonValidations.userRegisterId("user_register_id"),
    handleValidationErrors,
  ],
  resendOtp
);

// Sign In - Authenticate user with email/phone and password
router.post(
  API_ROUTES.AUTH.LOGIN.SIGN_IN,
  [
    commonValidations.loginType("login_type"),
    commonValidations.loginValue("login_value"),
    commonValidations.password("password", 6),
    handleValidationErrors,
  ],
  signIn
);

// OTP Based Login - Send OTP for login
router.post(
  API_ROUTES.AUTH.LOGIN.OTP_BASED_LOGIN,
  [
    commonValidations.loginVia("login_via"),
    commonValidations.loginValue("value"),
    handleValidationErrors,
  ],
  otpBasedLogin
);

// Verify Login OTP - Verify OTP for login
router.post(
  API_ROUTES.AUTH.LOGIN.VERIFY_LOGIN_OTP,
  [
    commonValidations.loginVia("login_via"),
    commonValidations.loginValue("value"),
    commonValidations.otp("otp"),
    handleValidationErrors,
  ],
  verifyLoginOtp
);

// Request Reset Password - Send OTP for password reset
router.post(
  API_ROUTES.AUTH.PASSWORD_RESET.REQUEST,
  [
    commonValidations.forgetWith("forget_with"),
    commonValidations.otpChannel("otp_channel"),
    handleValidationErrors,
  ],
  requestResetPassword
);

// Verify Reset OTP and Change Password - Verify OTP and set new password
router.post(
  API_ROUTES.AUTH.PASSWORD_RESET.VERIFY_OTP,
  [
    commonValidations.forgetWith("forget_with"),
    commonValidations.otpChannel("otp_channel"),
    commonValidations.otp("otp"),
    commonValidations.password("new_password", 6),
    handleValidationErrors,
  ],
  verifyResetOtp
);

// User Verification Request - Send OTP for user verification
router.post(
  API_ROUTES.AUTH.USER_VERIFY.REQUEST,
  [
    commonValidations.otpChannel("otp_channel"),
    commonValidations.verifyTo("verify_to"),
    handleValidationErrors,
  ],
  verifyRequest
);

// User Verification Confirm - Verify OTP for user verification
router.post(
  `${API_ROUTES.AUTH.USER_VERIFY.CONFIRM}/:verificationId`,
  [
    commonValidations.verificationId("verificationId"),
    commonValidations.verifyTo("verify_to"),
    commonValidations.otpChannel("otp_channel"),
    commonValidations.otp("otp"),
    handleValidationErrors,
  ],
  verifyConfirm
);

// User  set the Primary contact change like
router.post(
  API_ROUTES.AUTH.USER_PRIMARY.REQUEST,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.setprimary("set_primary"),
    handleValidationErrors,
  ],
  RequestPrimaryContact
);

// verify OTP for set new Primary Contact

router.post(
  API_ROUTES.AUTH.USER_PRIMARY.CONFIRM,
  authenticateToken,
  [
    commonValidations.userId("user_id"),
    commonValidations.OTP("otp"),
    handleValidationErrors,
  ],
  VerifyOTPforsetPrimaryContact
);

// Change User Password - Change the user password with old password

router.post(
  API_ROUTES.AUTH.PASSWORD_RESET.CHANGE_PASSWORD,
  [commonValidations.userId("user_id"), handleValidationErrors],
  ChangeUserpassword
);

// Validate New password with our old password
router.post(
  API_ROUTES.AUTH.PASSWORD_RESET.VALIDATE_PASSWORD,
  [
    commonValidations.userId("user_id"),
    handleValidationErrors
  ],
  ValidateNewPassword
)

router.post(
  API_ROUTES.AUTH.LOGOUT.USER_LOGOUT,
  authenticateToken,
  [handleValidationErrors],
  LogOutUser
);

// Suspend User - Suspend a user for a specific time period
router.post(
  API_ROUTES.AUTH.USER_MANAGEMENT.SUSPEND,
  [
    commonValidations.userIdForSuspension("user_id"),
    commonValidations.suspendUntil("suspend_until"),
    commonValidations.suspensionReason("reason"),
    handleValidationErrors,
  ],
  suspendUser
);

// Remove User Suspension - Remove suspension from a user
router.post(
  API_ROUTES.AUTH.USER_MANAGEMENT.REMOVE_SUSPENSION,
  [
    commonValidations.userIdForRemoveSuspension("user_id"),
    handleValidationErrors,
  ],
  removeUserSuspension
);

module.exports = router;
