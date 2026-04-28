const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminConfigSchema = new Schema(
  {
    active_partner: {
      type: String,
      required: true,
      default: "shiprocket",
    },

    /* 🔥 Dynamic partners */
    partners: {
      type: Map,
      of: Boolean,
      default: {
        shiprocket: true,
        delhivery: true,
        manual: false,
      },
    },

    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

adminConfigSchema.pre("save", function (next) {
  this.last_updated = new Date();
  next();
});

module.exports = mongoose.model("AdminConfig", adminConfigSchema);