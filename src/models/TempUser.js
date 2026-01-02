const mongoose = require("mongoose");
const { OTP_CONFIG } = require("../../constants");

const tempUserSchema = new mongoose.Schema({
  user_register_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  first_name: {
    type: String,
    required: true,
    trim: true,
  },
  last_name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp_channel: {
    type: String,
    enum: ["EMAIL", "PHONE"],
    required: true,
  },
  otp_code: {
    type: String,
    required: true,
  },
  otp_attempts: {
    type: Number,
    default: 0,
    max: OTP_CONFIG.MAX_ATTEMPTS,
  },
  otp_expires_at: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update updated_at field before saving
tempUserSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Static method to find by user_register_id
tempUserSchema.statics.findByRegisterId = function (userRegisterId) {
  return this.findOne({ user_register_id: userRegisterId });
};

// Static method to find by temp_user_id (for backward compatibility)
tempUserSchema.statics.findByTempId = function (tempUserId) {
  return this.findOne({ user_register_id: tempUserId });
};

// Static method to find by phone or email
tempUserSchema.statics.findByContact = function (contact) {
  return this.findOne({
    $or: [{ phone: contact }, { email: contact }],
  });
};

// Method to check if OTP is expired
tempUserSchema.methods.isOtpExpired = function () {
  return new Date() > this.otp_expires_at;
};

// Method to check if max attempts reached
tempUserSchema.methods.hasReachedMaxAttempts = function () {
  return this.otp_attempts >= OTP_CONFIG.MAX_ATTEMPTS;
};

// Method to increment OTP attempts
tempUserSchema.methods.incrementAttempts = function () {
  this.otp_attempts += 1;
  return this.save();
};

// Method to verify OTP
tempUserSchema.methods.verifyOtp = function (otp) {
  if (this.isOtpExpired()) {
    return { success: false, message: "OTP has expired" };
  }

  if (this.hasReachedMaxAttempts()) {
    return { success: false, message: "Maximum OTP attempts reached" };
  }

  if (this.otp_code !== otp) {
    this.incrementAttempts();
    return { success: false, message: "Invalid OTP" };
  }

  this.is_verified = true;
  return { success: true, message: "OTP verified successfully" };
};

module.exports = mongoose.model("TempUser", tempUserSchema);
