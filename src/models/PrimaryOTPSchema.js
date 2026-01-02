const mongoose = require("mongoose");

const PrimaryOTPSchema = new mongoose.Schema(
  {
    user_registered_id: {
      type: mongoose.Schema.Types.ObjectId,   // <-- STORE USER OBJECT ID
      ref: "User",
      required: true,
    },

    otp: {
      type: String,
      required: true,
      trim: true,
    },

    set_primary: {
      type: String,   // values: "email" or "phone"
      required: true,
      enum: ["email", "phone"],  // safer
      trim: true,
    },

    otp_expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrimaryOTP", PrimaryOTPSchema);
