const express = require("express");
const router = express.Router();

const {
  updateAndroidVersion,
  updateIOSVersion,
  updatePrivacyPolicy,
  updateTermsCondition,
  getAndroidVersion,
  getIOSVersion,
  getPrivacyPolicy,
  getTermsCondition,
  updateRazorpayKey,
  getAppInfo
} = require("../controllers/appInfo.controller");

// GET ANDROID VERSION
router.get("/api/v1/app-info/android", getAndroidVersion);

// GET IOS VERSION
router.get("/api/v1/app-info/ios", getIOSVersion);

// GET PRIVACY POLICY
router.get("/api/v1/app-info/privacy-policy", getPrivacyPolicy);

// GET TERMS & CONDITIONS
router.get("/api/v1/app-info/terms-condition", getTermsCondition);

// ANDROID VERSION UPDATE
router.post("/api/v1/app-info/android", updateAndroidVersion);

// IOS VERSION UPDATE
router.post("/api/v1/app-info/ios", updateIOSVersion);

// PRIVACY POLICY UPDATE
router.post("/api/v1/app-info/privacy-policy", updatePrivacyPolicy);

// TERMS & CONDITIONS UPDATE
router.post("/api/v1/app-info/terms-condition", updateTermsCondition);
// 🔑 RAZORPAY KEY ADD / UPDATE
router.post("/api/v1/app-info/razorpay-key", updateRazorpayKey);

// GET FULL APP INFO (Android, iOS, Policies everything)
router.get("/api/v1/app-info", getAppInfo);

  

module.exports = router;
