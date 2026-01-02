const mongoose = require("mongoose");

const VersionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    notes: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const PolicySchema = new mongoose.Schema(
  {
    policy: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const TermsSchema = new mongoose.Schema(
  {
    terms_condition: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AppInfoSchema = new mongoose.Schema(
  {
    app_version: {
      android: { type: VersionSchema, default: null },
      ios: { type: VersionSchema, default: null }
    },

    policy: {
      privacy_policy: { type: PolicySchema, default: null },
      terms_condition: { type: TermsSchema, default: null }
    },
     // ✅ NEW FIELD
     api_key: {
      razorpay_key_id: {
        type: String,
        trim: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppInfo", AppInfoSchema);
