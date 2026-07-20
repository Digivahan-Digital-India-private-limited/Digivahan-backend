const mongoose = require("mongoose");

const adminPermissionsSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
      index: true,
    },
    pages: {
      // key = page key, value = true (allowed) / false (hidden)
      // If a key is missing, it defaults to true (allowed)
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminPermissions", adminPermissionsSchema);
