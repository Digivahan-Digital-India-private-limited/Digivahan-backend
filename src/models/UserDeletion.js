const mongoose = require("mongoose");

const UserDeletionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletion_type: {
      type: String,
      enum: ["IMMEDIATE", "SCHEDULED"],
      required: true,
    },

    reason: {
      type: String,
      default: "",
    },

    deletion_days: {
      type: Number,
      required: true,
      min: 0, // allow 0 for immediate delete
    },

    deletion_date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },

    qr_ids: {
      type: [String], // store blocked QR IDs
      default: [],
    },

    qr_status: {
      type: String,
      enum: ["NONE", "BLOCKED"],
      default: "NONE",
    },

    isImmediate: {
      type: Boolean,
      default: false,
    },

    requested_at: {
      type: Date,
      default: Date.now,
    },

    completed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserDeletion", UserDeletionSchema);
