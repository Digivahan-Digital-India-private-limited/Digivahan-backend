const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 🔥 indexing added here
    },

    // 🔹 User request data (payload)
    billerId: String,
    externalRef: String,
    enquiryReferenceId: String,
    vehicle_number: String,
    mobile: String,
    transactionAmount: Number,

    // 🔹 Status tracking
    status: {
      type: String,
      enum: ["INIT", "SUCCESS", "FAILED"],
      default: "INIT",
    },

    // 🔹 Full API response (Mixed)
    full_payment_details: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ user_id: 1, createdAt: -1 });

const paymentDetails = mongoose.model("paymentDeatils", paymentSchema);

module.exports = paymentDetails;
