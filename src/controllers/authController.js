const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment");
const RevokedToken = require("../models/revokedTokenSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../utils/redis.js");
const mongoose = require("mongoose");

const {
  generateOTP,
  generateTempUserId,
  generateVerificationId,
  sendOTP,
} = require("../utils/otpUtils");

const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require("../../constants");

const { generateAuthToken } = require("../middleware/auth.js");

/**
 * Register Init - Step 1: Check user existence or collect user details and send OTP
 * POST /api/auth/register/init
 */

const registerInit = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, otp_channel } =
      req.body;

    if (!email || !phone || !password || !otp_channel) {
      return res.status(400).json({
        status: false,
        message: "Required fields missing",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    // 🚀 Fast existence check
    const emailExists = await User.exists({
      "basic_details.email": normalizedEmail,
    });
    if (emailExists) {
      return res.status(400).json({
        status: false,
        error_type: "email",
        message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
      });
    }

    const phoneExists = await User.exists({
      "basic_details.phone_number": normalizedPhone,
    });
    if (phoneExists) {
      return res.status(400).json({
        status: false,
        error_type: "phone",
        message: ERROR_MESSAGES.PHONE_ALREADY_REGISTERED,
      });
    }

    const contact = otp_channel === "PHONE" ? normalizedPhone : normalizedEmail;

    const allowed = await canSendOtpToday(contact);
    if (!allowed) {
      return res.status(429).json({
        status: false,
        message: ERROR_MESSAGES.OTP_LIMIT_REACHED,
      });
    }

    // 🔐 Generate
    const otpCode = generateOTP(4);
    const userRegisterId = generateTempUserId();

    // ✅ 1️⃣ Save OTP separately (for verify API)
    await redis.set(`otp:${userRegisterId}`, otpCode, "EX", 600);

    // ✅ 2️⃣ Save temp user data separately
    const tempUserData = {
      first_name,
      last_name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      otp_channel,
    };

    await redis.set(
      `tempUser:${userRegisterId}`,
      JSON.stringify(tempUserData),
      "EX",
      600,
    );

    // 📤 Send OTP
    const otpSent = await sendOTP(contact, otpCode, otp_channel, "signup");

    if (!otpSent) {
      await redis.del(`otp:${userRegisterId}`);
      await redis.del(`tempUser:${userRegisterId}`);

      return res.status(500).json({
        status: false,
        message: ERROR_MESSAGES.OTP_SEND_FAILED,
      });
    }

    return res.status(200).json({
      status: true,
      message: `OTP sent via ${otp_channel.toLowerCase()}`,
      user_register_id: userRegisterId,
      valid_until: new Date(Date.now() + 600000).toISOString(),
      otp_verify_endpoint: "auth/register/verify-otp",
    });
  } catch (error) {
    console.error("Register init error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify User - Step 2: Verify User account already register or not
 * POST /api/auth/check/init
 */

const checkRegisteredUser = async (req, res) => {
  try {
    const { phone, email, hit_type } = req.body;

    // Check if user already exists in permanent users table
    const existingUser = await User.findOne({
      $or: [
        { "basic_details.email": email },
        { "basic_details.phone_number": phone },
      ],
    });

    if (hit_type === "check") {
      if (existingUser) {
        // Check which field already exists
        if (existingUser.basic_details.email === email) {
          return res.status(400).json({
            status: false,
            error_type: "email",
            message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
          });
        } else if (existingUser.basic_details.phone_number === phone) {
          return res.status(400).json({
            status: false,
            error_type: "phone",
            message: ERROR_MESSAGES.PHONE_ALREADY_REGISTERED,
          });
        }
      }
    } else {
      res.status(400).json({
        status: false,
        message: "Invalid hit_type value",
      });
    }
    return res.status(200).json({
      status: true,
      message: ERROR_MESSAGES.USER_DOES_NOT_EXIST,
    });
  } catch (error) {
    console.error("Register init error:", error);
    res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify OTP - Step 3: Verify OTP and create user account
 * POST /api/auth/register/verify-otp
 */
const verifyOtp = async (req, res) => {
  try {
    const { user_register_id, otp } = req.body;

    if (!user_register_id || !otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid request",
      });
    }

    // 🔥 Get both Redis values in parallel
    const [savedOtp, tempUser] = await Promise.all([
      redis.get(`otp:${user_register_id}`),
      redis.get(`tempUser:${user_register_id}`),
    ]);

    if (!savedOtp || savedOtp !== otp) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.INVALID_OTP_CODE,
      });
    }

    if (!tempUser) {
      return res.status(400).json({
        status: false,
        error_type: "userId",
        message: ERROR_MESSAGES.INVALID_USER_REGISTER_ID,
      });
    }

    const data = JSON.parse(tempUser);

    // 🔥 Safety check (prevent duplicate if verify API called twice)
    const userExists = await User.exists({
      $or: [
        { "basic_details.email": data.email },
        { "basic_details.phone_number": data.phone },
      ],
    });

    if (userExists) {
      await Promise.all([
        redis.del(`otp:${user_register_id}`),
        redis.del(`tempUser:${user_register_id}`),
      ]);

      return res.status(400).json({
        status: false,
        message: "User already exists",
      });
    }

    // 🚀 Create user (minimal payload)
    const newUser = await User.create({
      basic_details: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone,
        password: data.password,
        phone_number_verified: data.otp_channel === "PHONE",
        is_phone_number_primary: data.otp_channel === "PHONE",
        profile_completion_percent: 20,
      },
      is_tracking_on: true,
      garage: { vehicles: [] },
      is_active: true,
    });

    const token = generateAuthToken({
      user_id: newUser._id,
      email: newUser.basic_details.email,
      phone_number: newUser.basic_details.phone_number,
    });

    // 🔥 Clean Redis in parallel
    await Promise.all([
      redis.del(`otp:${user_register_id}`),
      redis.del(`tempUser:${user_register_id}`),
    ]);

    const userResponse = {
      basic_details: {
        profile_pic: newUser.basic_details.profile_pic,
        first_name: newUser.basic_details.first_name,
        last_name: newUser.basic_details.last_name,
        phone_number: newUser.basic_details.phone_number,
        phone_number_verified: newUser.basic_details.phone_number_verified,
        is_phone_number_primary: newUser.basic_details.is_phone_number_primary,
        email: newUser.basic_details.email,
        is_email_verified: newUser.basic_details.is_email_verified,
        is_email_primary: newUser.basic_details.is_email_primary,
        password: "", // Never send password
        occupation: newUser.basic_details.occupation,
        profile_completion_percent:
          newUser.basic_details.profile_completion_percent,
      },
      public_details: {
        nick_name: newUser.public_details.nick_name,
        address: newUser.public_details.address,
        age: newUser.public_details.age,
        gender: newUser.public_details.gender,
        public_pic: newUser.public_details.public_pic,
      },
      is_tracking_on: newUser.is_tracking_on,
      is_notification_sound_on: newUser.is_notification_sound_on,
      token: token,
    };

    return res.status(200).json({
      status: true,
      message: "OTP verified. Account created successfully.",
      user: userResponse,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * User SignIn - Step 4: User SignIn when account is created
 * POST /api/auth/register/resend-otp
 */

const signIn = async (req, res) => {
  try {
    const { login_type, login_value, password } = req.body;

    if (!["email", "phone"].includes(login_type) || !login_value || !password) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Normalize input
    const identifier =
      login_type === "email"
        ? login_value.toLowerCase().trim()
        : login_value.trim();

    const query =
      login_type === "email"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    // 🔥 Minimal field selection (fast query)
    const user = await User.findOne(query).select(
      "basic_details public_details is_tracking_on is_notification_sound_on is_active account_status suspended_until suspension_reason is_logged_in deletion_date",
    );

    if (!user) {
      return res.status(401).json({
        status: false,
        error_type: login_type,
        message:
          login_type === "email"
            ? ERROR_MESSAGES.EMAIL_NOT_REGISTERED
            : ERROR_MESSAGES.PHONE_NOT_REGISTERED,
      });
    }

    // 🔥 Account active check
    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Suspension check
    if (user.suspended_until && new Date() < user.suspended_until) {
      return res.status(403).json({
        status: false,
        error_type: "suspended",
        message: ERROR_MESSAGES.USER_SUSPENDED,
        data: {
          suspended_until: user.suspended_until,
          reason: user.suspension_reason,
        },
      });
    }

    // 🔥 Password validation
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: false,
        error_type: "password",
        message: ERROR_MESSAGES.INVALID_PASSWORD,
      });
    }

    // 🔥 Verification check
    if (login_type === "email" && !user.basic_details.is_email_verified) {
      return res.status(401).json({
        status: false,
        error_type: "email_verify",
        message: ERROR_MESSAGES.EMAIL_VERIFY_REQUIRED,
      });
    }

    if (login_type === "phone" && !user.basic_details.phone_number_verified) {
      return res.status(401).json({
        status: false,
        error_type: "phone_verify",
        message: ERROR_MESSAGES.PHONE_VERIFY_REQUIRED,
      });
    }

    // 🔥 AUTO CANCEL PENDING DELETION (Parallel + Optimized)
    if (user.account_status === "PENDING_DELETION") {
      try {
        await Promise.all([
          User.updateOne(
            { _id: user._id },
            {
              $set: {
                account_status: "ACTIVE",
                deletion_date: null,
              },
            },
          ),
          UserDeletion.deleteMany({
            user_id: user._id,
            status: "PENDING",
          }),
          QRAssignment.updateMany(
            { user_id: user._id.toString() },
            { $set: { status: "active" } },
          ),
        ]);

        console.log(`User deletion auto-cancelled: ${user._id}`);
      } catch (err) {
        console.error("Deletion recovery error:", err);
        // ❗ Do NOT block login
      }
    }

    // 🔥 Update login status (no full save)
    await User.updateOne({ _id: user._id }, { $set: { is_logged_in: true } });

    const token = generateAuthToken({
      user_id: user._id,
      email: user.basic_details.email,
      phone_number: user.basic_details.phone_number,
    });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      user: {
        basic_details: {
          profile_pic: user.basic_details.profile_pic || "",
          first_name: user.basic_details.first_name || "",
          last_name: user.basic_details.last_name || "",
          phone_number: user.basic_details.phone_number || "",
          phone_number_verified:
            user.basic_details.phone_number_verified || false,
          is_phone_number_primary:
            user.basic_details.is_phone_number_primary || false,
          email: user.basic_details.email || "",
          is_email_verified: user.basic_details.is_email_verified || false,
          is_email_primary: user.basic_details.is_email_primary || false,
          occupation: user.basic_details.occupation || "",
          profile_completion_percent:
            user.basic_details.profile_completion_percent || 0,
        },
        public_details: {
          nick_name: user.public_details?.nick_name || "",
          address: user.public_details?.address || "",
          age: user.public_details?.age || 0,
          gender: user.public_details?.gender || "",
          public_pic: user.public_details?.public_pic || "",
        },
        is_tracking_on: user.is_tracking_on || false,
        is_notification_sound_on: user.is_notification_sound_on ?? true,
        token,
      },
    });
  } catch (error) {
    console.error("Sign in error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Resend OTP - Resend OTP when otp is expired
 * POST /api/auth/register/resend-otp
 */

const resendOtp = async (req, res) => {
  try {
    const { user_register_id } = req.body;

    if (!user_register_id) {
      return res.status(400).json({
        status: false,
        message: "Invalid request",
      });
    }

    // 🔥 Get temp user
    const tempUserStr = await redis.get(`tempUser:${user_register_id}`);

    if (!tempUserStr) {
      return res.status(400).json({
        status: false,
        error_type: "userId",
        message: ERROR_MESSAGES.INVALID_USER_REGISTER_ID,
      });
    }

    const tempUser = JSON.parse(tempUserStr);

    const contact =
      tempUser.otp_channel === "PHONE" ? tempUser.phone : tempUser.email;

    // 🔥 Cooldown check (30 sec)
    const cooldownKey = `otpCooldown:${user_register_id}`;
    const cooldown = await redis.get(cooldownKey);

    if (cooldown) {
      return res.status(429).json({
        status: false,
        message: "Please wait before requesting OTP again",
      });
    }

    // 🔥 Daily limit check
    const allowed = await canSendOtpToday(contact);
    if (!allowed) {
      return res.status(429).json({
        status: false,
        message: ERROR_MESSAGES.OTP_LIMIT_REACHED,
      });
    }

    // 🔥 Generate new OTP
    const newOtpCode = generateOTP(4);

    // 🔥 Update OTP + set cooldown in parallel
    await Promise.all([
      redis.set(`otp:${user_register_id}`, newOtpCode, "EX", 600),
      redis.set(cooldownKey, "1", "EX", 30), // 30 sec cooldown
    ]);

    // 🔥 Send OTP
    const otpSent = await sendOTP(
      contact,
      newOtpCode,
      tempUser.otp_channel,
      "signup",
    );

    if (!otpSent) {
      return res.status(500).json({
        status: false,
        message: ERROR_MESSAGES.OTP_SEND_FAILED,
      });
    }

    return res.status(200).json({
      status: true,
      message: `OTP resent via ${tempUser.otp_channel.toLowerCase()}.`,
      valid_until: new Date(Date.now() + 600000).toISOString(),
      otp_verify_endpoint: "auth/register/verify-otp",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Change Password - Update user password
 * POST /api/auth/register/change-password
 */

const ChangeUserpassword = async (req, res) => {
  try {
    const { user_id, old_password, new_password } = req.body;

    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    if (old_password === new_password) {
      return res.status(400).json({
        status: false,
        error_type: "new_password",
        message: "New password cannot be same as old password",
      });
    }

    // 🔥 Only required fields select
    const user = await User.findById(user_id).select(
      "basic_details.password old_passwords is_active is_logged_in",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Check old password
    const isOldPasswordCorrect = await bcrypt.compare(
      old_password,
      user.basic_details.password,
    );

    if (!isOldPasswordCorrect) {
      return res.status(400).json({
        status: false,
        error_type: "old_password",
        message: "Your old password doesn't match",
      });
    }

    // 🔥 Check new password against current + history in parallel
    const passwordChecks = [
      bcrypt.compare(new_password, user.basic_details.password),
      user.old_passwords?.previous_password1
        ? bcrypt.compare(new_password, user.old_passwords.previous_password1)
        : false,
      user.old_passwords?.previous_password2
        ? bcrypt.compare(new_password, user.old_passwords.previous_password2)
        : false,
      user.old_passwords?.previous_password3
        ? bcrypt.compare(new_password, user.old_passwords.previous_password3)
        : false,
    ];

    const results = await Promise.all(passwordChecks);

    if (results.some(Boolean)) {
      return res.status(400).json({
        status: false,
        error_type: "new_password",
        message: "New password cannot match current or previous passwords",
      });
    }

    // 🔥 Shift password history
    const updatedOldPasswords = {
      previous_password3: user.old_passwords?.previous_password2 || "",
      previous_password2: user.old_passwords?.previous_password1 || "",
      previous_password1: user.basic_details.password,
    };

    // 🔥 Update password (pre-save hook will hash it)
    user.basic_details.password = new_password;
    user.old_passwords = updatedOldPasswords;
    user.is_logged_in = true;

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Your password successfully updated",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

// Check new password with our database password are already avaliable or not
const ValidateNewPassword = async (req, res) => {
  try {
    const { user_id, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Only required fields select (important for speed)
    const user = await User.findById(user_id).select(
      "basic_details.password old_passwords",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    // 🔥 Check new password against current password
    const isSameAsCurrent = await bcrypt.compare(
      new_password,
      user.basic_details.password,
    );

    if (isSameAsCurrent) {
      return res.status(400).json({
        status: false,
        error_type: "password",
        message: ERROR_MESSAGES.PASSWORD_USED_PREVIOUSLY,
      });
    }

    // 🔥 Check against previous passwords (parallel)
    const oldPasswords = [
      user.old_passwords?.previous_password1,
      user.old_passwords?.previous_password2,
      user.old_passwords?.previous_password3,
    ].filter(Boolean);

    const passwordChecks = await Promise.all(
      oldPasswords.map((oldPass) => bcrypt.compare(new_password, oldPass)),
    );

    if (passwordChecks.includes(true)) {
      return res.status(400).json({
        status: false,
        error_type: "password",
        message: ERROR_MESSAGES.PASSWORD_USED_PREVIOUSLY,
      });
    }

    // 🔥 Hash new password manually (avoid full save middleware)
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(new_password, salt);

    // 🔥 Shift password history
    await User.updateOne(
      { _id: user_id },
      {
        $set: {
          "basic_details.password": hashedNewPassword,
          is_logged_in: true,
          "old_passwords.previous_password3":
            user.old_passwords?.previous_password2 || "",
          "old_passwords.previous_password2":
            user.old_passwords?.previous_password1 || "",
          "old_passwords.previous_password1": user.basic_details.password,
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Validate new password error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * OTP Based Login - Send OTP for login
 * POST /api/auth/otp-based-login
 */

const otpBasedLogin = async (req, res) => {
  try {
    const { login_via, value } = req.body;

    if (!["email", "phone"].includes(login_via) || !value) {
      return res.status(400).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Normalize input
    const identifier =
      login_via === "email" ? value.toLowerCase().trim() : value.trim();

    // 🔥 Single field query (NO $or)
    const query =
      login_via === "email"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    // 🔥 Select only required fields (important for speed)
    const user = await User.findOne(query).select(
      "is_active suspended_until suspension_reason",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        error_type: login_via,
        message:
          login_via === "email"
            ? ERROR_MESSAGES.EMAIL_NOT_REGISTERED_OTP
            : ERROR_MESSAGES.PHONE_NOT_REGISTERED_OTP,
      });
    }

    // 🔥 Account active check
    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Suspension check (faster than calling method)
    if (user.suspended_until && new Date() < user.suspended_until) {
      return res.status(403).json({
        status: false,
        error_type: "suspended",
        message: ERROR_MESSAGES.USER_SUSPENDED,
        data: {
          suspended_until: user.suspended_until,
          reason: user.suspension_reason,
        },
      });
    }

    // 🔥 Generate OTP
    const otpCode = generateOTP(4);
    const otpChannel = login_via.toUpperCase();

    const redisKey = `loginOtp:${identifier}`;

    // 🔥 Save OTP (overwrite old if exists)
    await redis.set(redisKey, otpCode, "EX", 600);

    // 🔥 Send OTP
    const otpSent = await sendOTP(identifier, otpCode, otpChannel, "login");

    if (!otpSent) {
      await redis.del(redisKey);
      return res.status(500).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.OTP_SEND_FAILED,
      });
    }

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      otp_valid_till: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verify_otp_url: "auth/verify-login-otp",
    });
  } catch (error) {
    console.error("OTP based login error:", error);
    return res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify Login OTP - Verify OTP for login
 * POST /api/auth/verify-login-otp
 */
const verifyLoginOtp = async (req, res) => {
  try {
    const { login_via, value, otp } = req.body;

    if (!["email", "phone"].includes(login_via) || !value || !otp) {
      return res.status(400).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Normalize input
    const identifier =
      login_via === "email" ? value.toLowerCase().trim() : value.trim();

    // 🔥 Single field query (NO $or)
    const query =
      login_via === "email"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    // 🔥 Select only required fields
    const user = await User.findOne(query).select(
      "basic_details public_details is_tracking_on is_notification_sound_on is_active suspended_until suspension_reason",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    // 🔥 Active check
    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Suspension check (faster than method)
    if (user.suspended_until && new Date() < user.suspended_until) {
      return res.status(403).json({
        status: false,
        error_type: "suspended",
        message: ERROR_MESSAGES.USER_SUSPENDED,
        data: {
          suspended_until: user.suspended_until,
          reason: user.suspension_reason,
        },
      });
    }

    const redisKey = `loginOtp:${identifier}`;
    const savedOtp = await redis.get(redisKey);

    if (!savedOtp) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.OTP_EXPIRED_VERIFY,
      });
    }

    if (savedOtp !== otp) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.OTP_INVALID,
      });
    }

    // 🔥 Prepare update object
    const updateObj = {
      is_logged_in: true,
    };

    if (login_via === "email") {
      updateObj["basic_details.is_email_verified"] = true;
    } else {
      updateObj["basic_details.phone_number_verified"] = true;
    }

    // 🔥 Update without full save (FASTER)
    await User.updateOne({ _id: user._id }, { $set: updateObj });

    // 🔥 Delete OTP from Redis
    await redis.del(redisKey);

    const token = generateAuthToken({
      user_id: user._id,
      email: user.basic_details.email,
      phone_number: user.basic_details.phone_number,
    });

    return res.status(200).json({
      status: true,
      message: ERROR_MESSAGES.OTP_VERIFIED_SUCCESS,
      user: {
        basic_details: {
          profile_pic: user.basic_details.profile_pic || "",
          first_name: user.basic_details.first_name || "",
          last_name: user.basic_details.last_name || "",
          phone_number: user.basic_details.phone_number || "",
          phone_number_verified:
            login_via === "phone"
              ? true
              : user.basic_details.phone_number_verified || false,
          is_phone_number_primary:
            user.basic_details.is_phone_number_primary || false,
          email: user.basic_details.email || "",
          is_email_verified:
            login_via === "email"
              ? true
              : user.basic_details.is_email_verified || false,
          is_email_primary: user.basic_details.is_email_primary || false,
          occupation: user.basic_details.occupation || "",
          profile_completion_percent:
            user.basic_details.profile_completion_percent || 0,
        },
        public_details: {
          nick_name: user.public_details?.nick_name || "",
          address: user.public_details?.address || "",
          age: user.public_details?.age || 0,
          gender: user.public_details?.gender || "",
          public_pic: user.public_details?.public_pic || "",
        },
        is_tracking_on: user.is_tracking_on || false,
        is_notification_sound_on: user.is_notification_sound_on ?? true,
        token,
      },
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    return res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Request Reset Password - Send OTP for password reset
 * POST /api/auth/request-reset-password
 */
const requestResetPassword = async (req, res) => {
  try {
    const { forget_with, otp_channel } = req.body;

    if (!forget_with || !["EMAIL", "PHONE"].includes(otp_channel)) {
      return res.status(400).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Normalize input
    const identifier =
      otp_channel === "EMAIL"
        ? forget_with.toLowerCase().trim()
        : forget_with.trim();

    // 🔥 Single field query (NO $or)
    const query =
      otp_channel === "EMAIL"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    // 🔥 Select only required fields (faster)
    const user = await User.findOne(query).select("basic_details is_active");

    if (!user) {
      return res.status(404).json({
        status: false,
        error_type: otp_channel === "EMAIL" ? "email" : "phone",
        message:
          otp_channel === "EMAIL"
            ? ERROR_MESSAGES.EMAIL_NOT_REGISTERED_RESET
            : ERROR_MESSAGES.PHONE_NOT_REGISTERED_RESET,
      });
    }

    // 🔥 Active check
    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Verification check
    if (otp_channel === "EMAIL" && !user.basic_details.is_email_verified) {
      return res.status(400).json({
        status: false,
        error_type: "email",
        message: ERROR_MESSAGES.EMAIL_NOT_VERIFIED_RESET,
      });
    }

    if (otp_channel === "PHONE" && !user.basic_details.phone_number_verified) {
      return res.status(400).json({
        status: false,
        error_type: "phone",
        message: ERROR_MESSAGES.PHONE_NOT_VERIFIED_RESET,
      });
    }

    // 🔥 Generate OTP
    const otpCode = generateOTP(4);

    const redisKey = `resetOtp:${identifier}`;

    // Save OTP in Redis (10 min)
    await redis.set(redisKey, otpCode, "EX", 600);

    const otpSent = await sendOTP(identifier, otpCode, otp_channel, "reset");

    if (!otpSent) {
      await redis.del(redisKey);
      return res.status(500).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.OTP_SEND_FAILED,
      });
    }

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      otp_valid_till: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verify_otp_url: "/auth/verify-reset-otp-change-password",
    });
  } catch (error) {
    console.error("Request reset password error:", error);
    return res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify Reset OTP and Change Password - Verify OTP and set new password
 * POST /api/auth/verify-reset-otp
 */
const verifyResetOtp = async (req, res) => {
  try {
    const { forget_with, otp_channel, otp, new_password } = req.body;

    if (
      !forget_with ||
      !otp ||
      !new_password ||
      !["EMAIL", "PHONE"].includes(otp_channel)
    ) {
      return res.status(400).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Normalize input
    const identifier =
      otp_channel === "EMAIL"
        ? forget_with.toLowerCase().trim()
        : forget_with.trim();

    // 🔥 Single indexed query
    const query =
      otp_channel === "EMAIL"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    const user = await User.findOne(query).select(
      "basic_details old_passwords is_active is_tracking_on is_notification_sound_on public_details",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    const redisKey = `resetOtp:${identifier}`;
    const savedOtp = await redis.get(redisKey);

    if (!savedOtp) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.OTP_EXPIRED_VERIFY,
      });
    }

    if (savedOtp !== otp) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.OTP_INVALID,
      });
    }

    // 🔥 Check against current password
    const isSamePassword = await user.comparePassword(new_password);
    if (isSamePassword) {
      return res.status(400).json({
        status: false,
        error_type: "password",
        message: ERROR_MESSAGES.SAME_PASSWORD,
      });
    }

    // 🔥 Check against previous passwords (parallel)
    const oldPasswords = [
      user.old_passwords.previous_password1,
      user.old_passwords.previous_password2,
      user.old_passwords.previous_password3,
    ].filter(Boolean);

    const matchResults = await Promise.all(
      oldPasswords.map((oldPass) => bcrypt.compare(new_password, oldPass)),
    );

    if (matchResults.includes(true)) {
      return res.status(400).json({
        status: false,
        error_type: "password",
        message: ERROR_MESSAGES.PASSWORD_USED_PREVIOUSLY,
      });
    }

    // 🔥 Shift password history
    user.old_passwords.previous_password3 =
      user.old_passwords.previous_password2;

    user.old_passwords.previous_password2 =
      user.old_passwords.previous_password1;

    user.old_passwords.previous_password1 = user.basic_details.password;

    // 🔥 Update password (pre-save hook hashes it)
    user.basic_details.password = new_password;
    user.is_logged_in = true;

    await user.save();

    const token = generateAuthToken({
      user_id: user._id,
      email: user.basic_details.email,
      phone_number: user.basic_details.phone_number,
    });

    await redis.del(redisKey);

    return res.status(200).json({
      status: true,
      message: ERROR_MESSAGES.PASSWORD_RESET_SUCCESS,
      login: true,
      user: {
        basic_details: {
          profile_pic: user.basic_details.profile_pic || "",
          first_name: user.basic_details.first_name || "",
          last_name: user.basic_details.last_name || "",
          phone_number: user.basic_details.phone_number || "",
          phone_number_verified:
            user.basic_details.phone_number_verified || false,
          is_phone_number_primary:
            user.basic_details.is_phone_number_primary || false,
          email: user.basic_details.email || "",
          is_email_verified: user.basic_details.is_email_verified || false,
          is_email_primary: user.basic_details.is_email_primary || false,
          occupation: user.basic_details.occupation || "",
          profile_completion_percent:
            user.basic_details.profile_completion_percent || 0,
        },
        public_details: {
          nick_name: user.public_details?.nick_name || "",
          address: user.public_details?.address || "",
          age: user.public_details?.age || 0,
          gender: user.public_details?.gender || "",
        },
        is_tracking_on: user.is_tracking_on || false,
        is_notification_sound_on: user.is_notification_sound_on ?? true,
        token,
      },
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    return res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify User Request - Send OTP for user verification
 * POST /api/auth/user/verify/request
 */
const verifyRequest = async (req, res) => {
  try {
    const { otp_channel, verify_to } = req.body;

    if (!verify_to || !["EMAIL", "PHONE"].includes(otp_channel)) {
      return res.status(400).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 Normalize input
    const identifier =
      otp_channel === "EMAIL"
        ? verify_to.toLowerCase().trim()
        : verify_to.trim();

    // 🔥 Single indexed query (faster than $or)
    const query =
      otp_channel === "EMAIL"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    const user = await User.findOne(query).select(
      "basic_details.is_email_verified basic_details.phone_number_verified is_active",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    }

    // 🔥 Already verified check
    if (otp_channel === "EMAIL" && user.basic_details.is_email_verified) {
      return res.status(400).json({
        status: false,
        message: "Email is already verified",
      });
    }

    if (otp_channel === "PHONE" && user.basic_details.phone_number_verified) {
      return res.status(400).json({
        status: false,
        message: "Phone number is already verified",
      });
    }

    // 🔥 Generate OTP & verification id
    const otpCode = generateOTP(4);
    const verificationId = generateVerificationId();

    const redisKey = `verifyOtp:${verificationId}`;

    // 🔥 Store minimal data in Redis (no need to store otp separately)
    await redis.set(
      redisKey,
      JSON.stringify({
        verify_to: identifier,
        otp_channel,
        otp: otpCode,
      }),
      "EX",
      600,
    );

    const otpSent = await sendOTP(identifier, otpCode, otp_channel, "verify");

    if (!otpSent) {
      await redis.del(redisKey);
      return res.status(500).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.OTP_SEND_FAILED,
      });
    }

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      verify_to: identifier,
      otp_verification_endpoint: `api/user/verify/confirm/${verificationId}`,
      verification_id: verificationId,
      valid_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Verify request error:", error);
    return res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify OTP - Verify OTP for user verification
 * POST /api/auth/user/verify/confirm/:verificationId
 */
const verifyConfirm = async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { verify_to, otp_channel, otp } = req.body;

    if (
      !verificationId ||
      !verify_to ||
      !otp ||
      !["EMAIL", "PHONE"].includes(otp_channel)
    ) {
      return res.status(400).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    const redisKey = `verifyOtp:${verificationId}`;
    const redisValue = await redis.get(redisKey);

    if (!redisValue) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.OTP_EXPIRED_VERIFY,
      });
    }

    const savedData = JSON.parse(redisValue);

    // 🔥 Normalize compare values
    const identifier =
      otp_channel === "EMAIL"
        ? verify_to.toLowerCase().trim()
        : verify_to.trim();

    if (
      savedData.otp !== otp ||
      savedData.verify_to !== identifier ||
      savedData.otp_channel !== otp_channel
    ) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: ERROR_MESSAGES.OTP_INVALID,
      });
    }

    // 🔥 Single indexed query (NO $or)
    const query =
      otp_channel === "EMAIL"
        ? { "basic_details.email": identifier }
        : { "basic_details.phone_number": identifier };

    const updateField =
      otp_channel === "EMAIL"
        ? { "basic_details.is_email_verified": true }
        : { "basic_details.phone_number_verified": true };

    const user = await User.findOneAndUpdate(
      query,
      { $set: updateField },
      { new: true },
    ).select("_id");

    if (!user) {
      return res.status(404).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    // 🔥 Delete OTP immediately
    await redis.del(redisKey);

    const verifiedMedium = otp_channel.toLowerCase();

    return res.status(200).json({
      status: true,
      message:
        verifiedMedium === "email"
          ? ERROR_MESSAGES.EMAIL_VERIFIED_SUCCESS
          : ERROR_MESSAGES.PHONE_VERIFIED_SUCCESS,
      verified_medium: verifiedMedium,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Verify confirm error:", error);
    return res.status(500).json({
      status: false,
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

// raised the Request to set Primary Contact No. throw the OTP validation
const RequestPrimaryContact = async (req, res) => {
  try {
    const { user_id, set_primary } = req.body;

    if (!user_id || !set_primary) {
      return res.status(400).json({
        status: false,
        message: "Invalid parameters",
      });
    }

    // 🔥 Fetch only required fields
    const user = await User.findById(user_id).select(
      "basic_details.email basic_details.phone_number basic_details.is_email_primary basic_details.is_email_verified basic_details.is_phone_number_primary basic_details.phone_number_verified",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const basic = user.basic_details;

    let primaryValue = "";
    let sendType = "";

    // 🔥 Identify primary contact
    if (basic.is_email_primary && basic.is_email_verified) {
      primaryValue = basic.email.toLowerCase().trim();
      sendType = "EMAIL";
    } else if (basic.is_phone_number_primary && basic.phone_number_verified) {
      primaryValue = basic.phone_number.trim();
      sendType = "PHONE";
    } else {
      return res.status(400).json({
        status: false,
        message: "No verified primary contact found",
      });
    }

    // 🔥 Generate OTP
    const otp = generateOTP(4);

    // 🔥 Redis key
    const redisKey = `primaryOtp:${user_id}`;

    // 🔥 Store in Redis (10 min expiry)
    const redisData = {
      otp,
      set_primary,
      sendType,
      contact: primaryValue,
    };

    await redis.set(redisKey, JSON.stringify(redisData), "EX", 600);

    // 🔥 Send OTP
    const otpSent = await sendOTP(primaryValue, otp, sendType, "primary");

    if (!otpSent) {
      await redis.del(redisKey);
      return res.status(500).json({
        status: false,
        message: "Failed to send OTP",
      });
    }

    return res.status(200).json({
      status: true,
      message: `OTP sent successfully to your primary ${sendType}`,
      primary_contact: primaryValue,
      expires_in: 600,
    });
  } catch (error) {
    console.error("RequestPrimaryContact Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Verify OTP for set the recent primary Contact No.
const VerifyOTPforsetPrimaryContact = async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    if (!user_id || !otp) {
      return res.status(400).json({
        status: false,
        message: "user_id and otp are required",
      });
    }

    // 🔥 Redis key
    const redisKey = `primaryOtp:${user_id}`;
    const redisValue = await redis.get(redisKey);

    if (!redisValue) {
      return res.status(400).json({
        status: false,
        error_type: "OTP",
        message: "OTP expired or not found",
      });
    }

    const savedData = JSON.parse(redisValue);

    // 🔥 OTP match check
    if (savedData.otp !== otp) {
      return res.status(401).json({
        status: false,
        error_type: "OTP",
        message: "Invalid OTP",
      });
    }

    // 🔥 Prepare update object (NO full document load)
    let updateData = {};

    if (savedData.set_primary === "phone") {
      updateData = {
        "basic_details.is_phone_number_primary": true,
        "basic_details.is_email_primary": false,
        "basic_details.phone_number_verified": true,
      };
    } else if (savedData.set_primary === "email") {
      updateData = {
        "basic_details.is_email_primary": true,
        "basic_details.is_phone_number_primary": false,
        "basic_details.is_email_verified": true,
      };
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid primary type",
      });
    }

    // 🔥 Atomic update (no find → save cycle)
    const result = await User.updateOne({ _id: user_id }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 🔥 Delete OTP from Redis (prevent reuse)
    await redis.del(redisKey);

    return res.status(200).json({
      status: true,
      message: `Primary ${savedData.set_primary} updated successfully`,
    });
  } catch (error) {
    console.error("Verify primary OTP error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Logout User
const LogOutUser = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access token required",
      });
    }

    // 1️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2️⃣ Convert exp (seconds) → Date
    const expiryDate = new Date(decoded.exp * 1000);

    // 3️⃣ Save revoked token
    await RevokedToken.create({
      token: token,
      date: expiryDate,
    });

    return res.status(200).json({
      status: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

/**
 * Suspend User - Suspend a user for a specific time period
 * POST /api/auth/suspend-user
 */

const suspendUser = async (req, res) => {
  try {
    const { user_id, suspend_until, reason } = req.body;

    if (!user_id || !suspend_until || !reason) {
      return res.status(400).json({
        status: false,
        message: "user_id, suspend_until and reason are required",
      });
    }

    const suspendDate = new Date(suspend_until);

    if (isNaN(suspendDate.getTime()) || suspendDate <= new Date()) {
      return res.status(400).json({
        status: false,
        message: "Invalid suspend date",
      });
    }

    // 🔥 Optimized single query update
    const user = await User.findOneAndUpdate(
      {
        $or: [
          { "basic_details.email": user_id },
          { "basic_details.phone_number": user_id },
        ],
        $or: [
          { suspended_until: null },
          { suspended_until: { $lte: new Date() } }, // not currently suspended
        ],
      },
      {
        $set: {
          suspended_until: suspendDate,
          suspension_reason: reason,
          is_logged_in: false,
        },
      },
      {
        new: true,
        select: "_id suspended_until suspension_reason",
      },
    );

    if (!user) {
      // Check if user exists but already suspended
      const existingUser = await User.findOne({
        $or: [
          { "basic_details.email": user_id },
          { "basic_details.phone_number": user_id },
        ],
      }).select("_id suspended_until suspension_reason");

      if (!existingUser) {
        return res.status(404).json({
          status: false,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      return res.status(400).json({
        status: false,
        message: SUCCESS_MESSAGES.USER_ALREADY_SUSPENDED,
        data: {
          user_id: existingUser._id,
          suspended_till: existingUser.suspended_until,
          reason: existingUser.suspension_reason,
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.USER_SUSPENDED_SUCCESSFULLY,
      data: {
        user_id: user._id,
        suspended_till: user.suspended_until,
        reason: user.suspension_reason,
      },
    });
  } catch (error) {
    console.error("Suspend user error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Remove User Suspension - Remove suspension from a user
 * POST /api/auth/remove-suspension
 */
const removeUserSuspension = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    // 🔥 Atomic update (only if suspended)
    const user = await User.findOneAndUpdate(
      {
        $or: [
          { "basic_details.email": user_id },
          { "basic_details.phone_number": user_id },
        ],
        suspended_until: { $ne: null }, // must be suspended
      },
      {
        $set: {
          suspended_until: null,
          suspension_reason: "",
        },
      },
      {
        new: true,
        select: "_id",
      },
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND_OR_NOT_SUSPENDED,
      });
    }

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.USER_ACTIVATED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Remove user suspension error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.SERVER_ISSUE,
    });
  }
};

const MAX_DAILY_OTP = 3;

const canSendOtpToday = async (contact) => {
  const key = `otpLimit:${contact}`;
  const count = await redis.incr(key);

  if (count === 1) {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const secondsTillMidnight = Math.floor((midnight - now) / 1000);
    await redis.expire(key, secondsTillMidnight);
  }

  return count <= MAX_DAILY_OTP;
};

module.exports = {
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
};
