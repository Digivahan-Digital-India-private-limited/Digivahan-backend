const mongoose = require("mongoose");
const { OTP_CONFIG } = require("../../constants");

const otpSchema = new mongoose.Schema({
  contact: {
    type: String,
    required: true,
    index: true,
  },
  otp_code: {
    type: String,
    required: true,
  },
  otp_channel: {
    type: String,
    enum: ["EMAIL", "PHONE"],
    required: true,
  },
  attempts_today: {
    type: Number,
    default: 1,
    max: OTP_CONFIG.MAX_ATTEMPTS,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true,
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
  },
  is_used: {
    type: Boolean,
    default: false,
  },
  verification_id: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for contact and date
otpSchema.index({ contact: 1, date: 1 });

// Static method to find today's OTP attempts for a contact
otpSchema.statics.getTodayAttempts = function (contact) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return this.findOne({ contact, date: today });
};

// Static method to create or update OTP record
otpSchema.statics.createOrUpdateOtp = async function (
  contact,
  otpCode,
  otpChannel,
  verificationId = null
) {
  
  const today = new Date().toISOString().split("T")[0];
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Check if there's already a record for today
  const existingOtp = await this.findOne({ contact, date: today });

  if (existingOtp) {
    // Update existing record
    existingOtp.otp_code = otpCode;
    existingOtp.otp_channel = otpChannel;
    existingOtp.attempts_today += 1;
    existingOtp.expires_at = expiresAt;
    existingOtp.is_used = false;
    existingOtp.created_at = new Date();
    if (verificationId) {
      existingOtp.verification_id = verificationId;
    }
    return await existingOtp.save();
  } else {
    // Create new record
    const otpData = {
      contact,
      otp_code: otpCode,
      otp_channel: otpChannel,
      attempts_today: 1,
      date: today,
      expires_at: expiresAt,
    };

    if (verificationId) {
      otpData.verification_id = verificationId;
    }

    return await this.create(otpData);
  }
};

// Static method to verify OTP
otpSchema.statics.verifyOtp = async function (contact, otpCode) {
  const today = new Date().toISOString().split("T")[0];
  const otpRecord = await this.findOne({ contact, date: today });

  if (!otpRecord) {
    return { success: false, message: "No OTP found for this contact" };
  }

  if (otpRecord.is_used) {
    return { success: false, message: "OTP has already been used" };
  }

  if (new Date() > otpRecord.expires_at) {
    return { success: false, message: "OTP has expired" };
  }

  if (otpRecord.otp_code !== otpCode) {
    return { success: false, message: "Invalid OTP" };
  }

  // Mark OTP as used
  otpRecord.is_used = true;
  await otpRecord.save();

  return { success: true, message: "OTP verified successfully" };
};

// Static method to check if contact has reached daily limit
otpSchema.statics.hasReachedDailyLimit = async function (contact) {
  const today = new Date().toISOString().split("T")[0];
  const otpRecord = await this.findOne({ contact, date: today });

  if (!otpRecord) {
    return false;
  }

  return otpRecord.attempts_today >= OTP_CONFIG.MAX_ATTEMPTS;
};

// Method to check if OTP is expired
otpSchema.methods.isExpired = function () {
  return new Date() > this.expires_at;
};

module.exports = mongoose.model("OTP", otpSchema);
