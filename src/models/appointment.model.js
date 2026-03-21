const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    companyName: {
      type: String
    },

    phoneNumber: {
      type: String,
      required: true,
      index: true
    },

    businessEmail: {
      type: String,
      required: true,
      index: true
    },

    whomToMeet: {
      type: String,
      required: true,
      index: true
    },

    role: {
      type: String,
      required: true,
      index: true
    },

    reason: {
      type: String,
      required: true
    },

    proposalDescription: {
      type: String
    },

    requestedDate: {
      type: Date,
      required: true
    },

    appointmentDate: {
      type: Date
    },

    agentName: {
      type: String
    },

    agentPhone: {
      type: String
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "visited"],
      default: "pending",
      index: true
    }
  },
  {
    timestamps: true
  }
);

// compound index for filtering
appointmentSchema.index({ whomToMeet: 1, role: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);