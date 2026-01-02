// src/models/fuel.model.js
const mongoose = require('mongoose');

// Small schema for price object (no _id)
const StatePriceSchema = new mongoose.Schema(
  {
    cng: { type: Number, required: true, min: 0 },
    petrol: { type: Number, required: true, min: 0 },
    diesel: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const FuelSchema = new mongoose.Schema(
  {
    // states: map of "StateName" -> { cng, petrol, diesel }
    states: {
      type: Map,
      of: StatePriceSchema,
      default: {}
    },

    // store updatedAt as you requested (optional)
    updatedAt: { type: Date, default: null }
  },
  {
    // Note: no timestamps here so createdAt/updatedAt won't be added automatically
    versionKey: false
  }
);

module.exports = mongoose.model('Fuel', FuelSchema);
