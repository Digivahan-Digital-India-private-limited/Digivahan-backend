const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    icon_public_id: {
      type: String,
      default: "",
    },
    service_type: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", serviceSchema);
