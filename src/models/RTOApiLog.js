const mongoose = require("mongoose");

/**
 * Logs every real HTTP call made to Kashi Digital RTO APIs.
 * Created whenever:
 *  - A user adds a vehicle (addVehicle) and cache miss triggers the API
 *  - A user refreshes vehicle data (RefreshVehicleData)
 */
const rtoApiLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      index: true,
    },
    apiType: {
      type: String,
      enum: ["rto_api", "rto_premium_api", "challan_plus_api"],
      default: "rto_api",
      index: true,
    },
    trigger: {
      type: String,
      enum: ["add_vehicle", "refresh", "challan_search", "challan_refresh"],
      default: "add_vehicle",
    },

    success: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt = exact time of API call
    versionKey: false,
  }
);

rtoApiLogSchema.index({ userId: 1, vehicleNumber: 1 });
rtoApiLogSchema.index({ vehicleNumber: 1, createdAt: -1 });

module.exports = mongoose.model("RTOApiLog", rtoApiLogSchema);
