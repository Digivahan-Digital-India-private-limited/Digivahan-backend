// src/models/fuel.model.js
const mongoose = require("mongoose");

const FuelSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
      unique: true,
      index: true, // 🔥 FAST lookup + sort
    },
    cng: { type: Number, default: null },
    petrol: { type: Number, required: true },
    diesel: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

module.exports = mongoose.model("Fuel", FuelSchema);
