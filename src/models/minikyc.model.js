const mongoose = require("mongoose");

const kycschema = new mongoose.Schema({
  responseData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, { timestamps: true });

const kycdata = mongoose.model("kycdata", kycschema);

module.exports = kycdata;