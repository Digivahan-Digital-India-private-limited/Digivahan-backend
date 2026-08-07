const mongoose = require("mongoose");

/**
 * Tracks vehicle numbers for which 3rd party API returned an error
 * (code: 500 / "Please Contact Support") — meaning the API has no data for them.
 * Admin can view these, select, download as PDF, and mark as downloaded.
 */
const vehicleForAddSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,   // Only one record per vehicle number
      index: true,
    },
    // How many times this vehicle failed (to gauge demand)
    failCount: {
      type: Number,
      default: 1,
    },
    // Last time this vehicle was searched and failed
    lastFailedAt: {
      type: Date,
      default: Date.now,
    },
    // Which APIs failed for this vehicle
    failedApis: {
      type: [String],
      default: [],
    },
    // Whether admin has downloaded this vehicle for manual addition
    isDownloaded: {
      type: Boolean,
      default: false,
      index: true,
    },
    downloadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

vehicleForAddSchema.index({ isDownloaded: 1, lastFailedAt: -1 });

module.exports = mongoose.model("VehicleForAdd", vehicleForAddSchema);
