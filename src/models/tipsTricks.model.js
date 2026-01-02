const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    icon: {
      type: String,
      required: true,
    },
    icon_public_id: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const tipsTricksSchema = new mongoose.Schema(
  {
    banner: {
      type: String,
      required: true,
    },
    banner_public_id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: [pointSchema],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("TipsTricks", tipsTricksSchema);
