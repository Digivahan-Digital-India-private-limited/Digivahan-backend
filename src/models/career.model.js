const mongoose = require("mongoose");

const careerJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      enum: ["Engineering", "Business", "Operations", "Design"],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["Full Time", "Part Time", "Internship", "Contract"],
    },
    experience: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate jobId before saving
careerJobSchema.pre("save", async function (next) {
  if (!this.jobId) {
    const count = await mongoose.model("CareerJob").countDocuments();
    this.jobId = `DV-${100 + count + 1}`;
  }
  next();
});

// Virtual "posted" field for frontend compatibility
careerJobSchema.virtual("posted").get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 5) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
});

careerJobSchema.set("toJSON", { virtuals: true });
careerJobSchema.set("toObject", { virtuals: true });

const CareerJob = mongoose.model("CareerJob", careerJobSchema);

module.exports = CareerJob;
