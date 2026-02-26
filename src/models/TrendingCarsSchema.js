const mongoose = require("mongoose");

const trendingCarsSchema = new mongoose.Schema(
  {
    brand_name: { type: String, required: true, trim: true, index: true },
    model_name: { type: String, trim: true, default: "", index: true },
    car_details: { type: mongoose.Schema.Types.Mixed, default: {} },

    // 🔥 Random key for fast random fetch
    randomKey: {
      type: Number,
      default: () => Math.random(),
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: false,
  },
);

module.exports = mongoose.model("TrendingCar", trendingCarsSchema);
