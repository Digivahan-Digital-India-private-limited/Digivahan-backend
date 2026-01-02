const mongoose = require("mongoose");

const vehicleInfo = new mongoose.Schema({
  vehicle_id: String,
  api_data: mongoose.Schema.Types.Mixed,  // <-- ANY data will be accepted
});


const VehicleInfoSchema = new mongoose.Schema({
  vehicles: [vehicleInfo],
});

module.exports = mongoose.model("VehicleInfoData", VehicleInfoSchema);
