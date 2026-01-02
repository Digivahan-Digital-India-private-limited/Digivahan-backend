const mongoose = require("mongoose");

const vehicleComparisonSchema = new mongoose.Schema(
  {
    car_data: [
      {
        car_1_data: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        car_2_data: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("VehicleComparison", vehicleComparisonSchema);
