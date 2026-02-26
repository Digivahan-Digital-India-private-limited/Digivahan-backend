const mongoose = require("mongoose");
const vehicleInfoSchema = new mongoose.Schema({
  vehicle_id: {
    type: String,
    required: true,
    unique: true,
    index: true, // 🔥 FAST LOOKUP
  },
  api_data: mongoose.Schema.Types.Mixed,
  data_source: String,
  last_updated: Date,
});

module.exports = mongoose.model("VehicleInfoData", vehicleInfoSchema);
