const mongoose = require("mongoose");

const VersionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    notes: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PolicySchema = new mongoose.Schema(
  {
    policy_page_url: { type: String, default: "" },
  },
  { _id: false }
);

const TermsSchema = new mongoose.Schema(
  {
    terms_condition_page_url: { type: String, default: "" },
  },
  { _id: false }
);

const AboutSchema = new mongoose.Schema(
  {
    about_page_url: { type: String, default: "" },
  },
  { _id: false }
);

const AppInfoSchema = new mongoose.Schema({
  app_version: {
    android: { type: VersionSchema, default: null },
    ios: { type: VersionSchema, default: null },
  },

  policy: {
    privacy_policy: { type: PolicySchema, default: {} },
    terms_condition: { type: TermsSchema, default: {} },
    About_page: { type: AboutSchema, default: {} },
  },
  
  // ✅ NEW FIELD
  api_key: {
    razorpay_key_id: { type: String, trim: true },
    is_payment: { type: Boolean, default: true },
  },

  // Zigo Data
  zigoApp_data: {
    zigoAppID: { type: String, default: "" },
    zigoAppSignKey: { type: String, default: "" },
  },
});

module.exports = mongoose.model("AppInfo", AppInfoSchema);
