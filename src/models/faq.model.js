const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

/*
Indexes
type -> fast category filtering
question text search (optional future use)
*/

faqSchema.index({ type: 1 });
faqSchema.index({ question: "text" });

module.exports = mongoose.model("FAQ", faqSchema);