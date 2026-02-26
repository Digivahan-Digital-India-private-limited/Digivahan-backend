const mongoose = require("mongoose");

const vehicleComparisonSchema = new mongoose.Schema(
  {
    car_1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrendingCar",
      required: true,
      index: true,
    },
    car_2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrendingCar",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// prevent duplicate comparisons
vehicleComparisonSchema.index({ car_1: 1, car_2: 1 }, { unique: true });

module.exports = mongoose.model("VehicleComparison", vehicleComparisonSchema);
