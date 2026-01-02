const crypto = require("crypto");
const axios = require("axios");
const { OTP_CONFIG, OTP_CHANNEL } = require("../../constants");
const { getMailOptions, transporter } = require("./sendEmail");

/**
 * Generate a random OTP code
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - Generated OTP code
 */
const generateOTP = (length = OTP_CONFIG.LENGTH) => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }

  return otp;
};

/**
 * Generate a unique temporary user ID
 * @returns {string} - Generated temp user ID
 */
const generateTempUserId = () => {
  return crypto.randomBytes(10).toString("hex"); // 20 characters
};

/**
 * Generate a unique verification ID
 * @returns {string} - Generated verification ID
 */
const generateVerificationId = () => {
  return crypto.randomBytes(6).toString("hex"); // 12 characters
};
/**
 * Send OTP via SMS using PRP SMS service
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {string} templateType - Type of OTP (signup, login, reset)
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPViaSMS = async (phone, otp, templateType= "signup") => {
  console.log(templateType);
  
  try {
    // PRP SMS API configuration
    const prpSmsConfig = {
      apiUrl:
        process.env.PRP_SMS_API_URL ||
        "https://api.prpsms.biz/BulkSMSapi/keyApiSendSMS/SendSmsTemplateName",
      apiKey: process.env.PRP_SMS_API_KEY,
      sender: process.env.PRP_SMS_SENDER || "DGVAHN",
      templates: {
        signup: process.env.PRP_SMS_SIGNUP_TEMPLATE_NAME || "SignUp_OTP",
        login: process.env.PRP_SMS_LOGIN_TEMPLATE_NAME || "SignIn_OTP",
        reset: process.env.PRP_SMS_RESET_TEMPLATE_NAME || "Reset_Password_OTP",
        verify: process.env.PRP_SMS_2FA_TEMPLATE_NAME || "2FA_Verification_OTP",
      },
    };

    // Validate configuration
    if (!prpSmsConfig.apiKey || !prpSmsConfig.sender) {
      console.error(
        "PRP SMS configuration missing. Please check environment variables."
      );
      return false;
    }

    // Get template name based on type
    const templateName = prpSmsConfig.templates[templateType];
    if (!templateName) {
      console.error(`Template name not found for type: ${templateType}`);
      return false;
    }

    // Prepare SMS payload for PRP SMS API
    const smsPayload = {
      sender: prpSmsConfig.sender,
      templateName: templateName,
      smsReciever: [
        {
          mobileNo: phone,
          templateParams: otp,
        },
      ],
    };

    // Send SMS via PRP SMS API
    const response = await axios.post(prpSmsConfig.apiUrl, smsPayload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: prpSmsConfig.apiKey,
      },
      timeout: 10000, // 10 second timeout
    });

    // Check response status
    if (response.data.isSuccess) {
      console.log(`📱 SMS sent successfully to ${phone} via PRP SMS`);
      console.log(`Response:`, response.data);
      return true;
    } else {
      console.error("PRP SMS API error:", response.data);
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS via PRP SMS:", error.message);

    // Fallback to console log for development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `📱 [DEV] SMS would be sent to ${phone}: Your OTP is ${otp}. Valid for 10 minutes.`
      );
      return true;
    }
    return false;
  }
};

/**
 * Send OTP via Email
 * @param {string} email - Email address
 * @param {string} otp - OTP code
 * @param {string} templateType - Type of OTP (signup, login, reset, verify)
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPViaEmail = async (email, otp, templateType = "signup") => {
  try {
    const mailOptions = getMailOptions(templateType, email, otp);

    // Check if FROM_EMAIL is configured
    if (!process.env.FROM_EMAIL) {
      console.error(
        "FROM_EMAIL environment variable is not configured. Please set it to a verified AWS SES email address."
      );
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📧 [DEV] Email would be sent to ${email}: Your OTP is ${otp}. Valid for 10 minutes.`
        );
        return true;
      }
      return false;
    }

    const result = await transporter.sendMail(mailOptions);

    console.log(`📧 Email sent successfully to ${email}`);
    console.log(`Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    // Handle AWS SES specific errors
    if (error.code === "EMESSAGE" && error.responseCode === 554) {
      const errorMessage = error.response || error.message || "";

      // Check if it's a verification error
      if (errorMessage.includes("Email address is not verified")) {
        const unverifiedEmail =
          errorMessage.match(
            /Email address is not verified[^:]*:\s*([^\s]+)/
          )?.[1] || process.env.FROM_EMAIL;

        console.error(
          `❌ AWS SES Error: Email address "${unverifiedEmail}" is not verified in AWS SES.`
        );
        console.error(
          `   Please verify this email address in the AWS SES Console (${
            process.env.SES_SMTP_HOST?.replace("email-smtp.", "").replace(
              ".amazonaws.com",
              ""
            ) || "AP-SOUTH-1"
          } region)`
        );
        console.error(
          `   Alternatively, use a verified domain or request production access from AWS SES.`
        );
      } else {
        console.error("AWS SES Error:", errorMessage);
      }
    } else {
      console.error("Error sending email:", error.message || error);
    }

    // Fallback to console log for development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `📧 [DEV] Email sending failed, but OTP for ${email} is: ${otp}. Valid for 10 minutes.`
      );
      return true;
    }

    return false;
  }
};

/**
 * Send OTP via selected channel
 * @param {string} contact - Phone or email
 * @param {string} otp - OTP code
 * @param {string} channel - OTP channel (EMAIL or PHONE)
 * @param {string} templateType - Type of OTP (signup, login, reset)
 * @returns {Promise<boolean>} - Success status
 */
const sendOTP = async (contact, otp, channel, templateType = "signup") => {
  try {
    if (channel === OTP_CHANNEL.PHONE) {
      return await sendOTPViaSMS(contact, otp, templateType);
    } else if (channel === OTP_CHANNEL.EMAIL) {
      return await sendOTPViaEmail(contact, otp, templateType);
    } else {
      throw new Error("Invalid OTP channel");
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phone) => {
  // Add masking for security (show only last 4 digits)
  if (phone.length > 4) {
    return "*".repeat(phone.length - 4) + phone.slice(-4);
  }
  return phone;
};

/**
 * Format email for display
 * @param {string} email - Email address
 * @returns {string} - Formatted email
 */
const formatEmail = (email) => {
  const [username, domain] = email.split("@");
  if (username.length > 2) {
    const maskedUsername =
      username[0] +
      "*".repeat(username.length - 2) +
      username[username.length - 1];
    return `${maskedUsername}@${domain}`;
  }
  return email;
};

/**
 * Format contact for display based on channel
 * @param {string} contact - Phone or email
 * @param {string} channel - OTP channel
 * @returns {string} - Formatted contact
 */
const formatContactForDisplay = (contact, channel) => {
  if (channel === OTP_CHANNEL.PHONE) {
    return formatPhoneNumber(contact);
  } else if (channel === OTP_CHANNEL.EMAIL) {
    return formatEmail(contact);
  }
  return contact;
};

module.exports = {
  generateOTP,
  generateTempUserId,
  generateVerificationId,
  sendOTP,
  sendOTPViaSMS,
  sendOTPViaEmail,
  formatPhoneNumber,
  formatEmail,
  formatContactForDisplay,
};
