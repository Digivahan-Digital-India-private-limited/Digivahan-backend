const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    last_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    profile_url: {
      type: String,
      default: "",
    },

    profile_id: {
      type: String,
      default: "",
    },

    /* login tracking */
    last_login_at: {
      type: Date,
      default: null,
      index: true,
    },

    /* optional but recommended */
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* optional role support (future scaling) */
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager"],
      default: "admin",
      index: true,
    },

    /* optional login status */
    is_logged_in: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  },
);

// 🔥 Explicit index (recommended)
adminSchema.index({ phone: 1 });

module.exports = mongoose.model("Admin", adminSchema);
