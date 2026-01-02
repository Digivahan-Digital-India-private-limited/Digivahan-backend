const mongoose = require("mongoose");

const QrBenefitsSchema = new mongoose.Schema(
  {
    video_thumbnail: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      required: true,
    },
    video_title: {
      type: String,
      required: true,
      trim: true,
    },
    video_url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, 
    versionKey: false }
);

module.exports = mongoose.model("QrBenefits", QrBenefitsSchema);
