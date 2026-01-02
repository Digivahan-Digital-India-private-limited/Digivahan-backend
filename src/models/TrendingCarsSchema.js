const mongoose = require("mongoose");

const trendingCarsSchema = new mongoose.Schema(
  {
    // ✅ ONLY REQUIRED FIELD
    brand_name: {
      type: String,
      required: true,
      trim: true,
    },

    // 🟡 Optional basic identifiers (safe to keep)
    model_name: {
      type: String,
      trim: true,
      default: "",
    },

    // 🔥 ALL OTHER CAR DATA (fully flexible)
    car_details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: false, // 🔥 allows extra fields also
  }
);

module.exports = mongoose.model("TrendingCar", trendingCarsSchema);
