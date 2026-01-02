const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    banner: {
      type: String, // cloudinary secure_url
      required: true,
    },
    banner_public_id: {
      type: String, // cloudinary public_id
      required: true,
    },
    news_type: {
      type: String,
      enum: ["general", "update", "alert", "promotion"],
      required: true,
    },
    heading: {
      type: String,
      required: true,
      trim: true,
    },
    sub_heading: {
      type: String,
      trim: true,
    },
    news: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false, // __v hata diya ❤️
  }
);

module.exports = mongoose.model("News", newsSchema);
