const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    banner: {
      type: String,
      required: true,
    },
    banner_public_id: {
      type: String,
      required: true,
      index: true, // 🔥 helpful for delete/update
    },
    news_type: {
      type: String,
      enum: ["general", "update", "alert", "promotion"],
      required: true,
      index: true, // 🔥 filter fast
    },
    heading: {
      type: String,
      required: true,
      trim: true,
      index: true, // 🔥 future search
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
    versionKey: false,
  }
);

// 🔥 Most important index (latest first fetch)
newsSchema.index({ createdAt: -1 });

module.exports = mongoose.model("News", newsSchema);
