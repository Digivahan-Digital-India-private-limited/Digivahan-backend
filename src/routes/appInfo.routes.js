const express = require("express");
const router = express.Router();

const {
  updateAndroidVersion,
  updateIOSVersion,
  updatePrivacyPolicy,
  updateTermsCondition,
  updateAboutpage,
  getAndroidVersion,
  getIOSVersion,
  updateRazorpaytestKey,
  updateRazorpayliveKey,
  getAppInfo,
  updateZigoAppData
} = require("../controllers/appInfo.controller");

// GET ANDROID VERSION
router.get("/api/v1/app-info/android", getAndroidVersion);

// GET IOS VERSION
router.get("/api/v1/app-info/ios", getIOSVersion);

// ANDROID VERSION UPDATE
router.post("/api/v1/app-info/android", updateAndroidVersion);

// IOS VERSION UPDATE
router.post("/api/v1/app-info/ios", updateIOSVersion);

// PRIVACY POLICY UPDATE
router.post("/api/v1/app-info/privacy-policy", updatePrivacyPolicy);

// TERMS & CONDITIONS UPDATE
router.post("/api/v1/app-info/terms-condition", updateTermsCondition);

// ABOUT & ABOUTPAGE
router.post("/api/v1/app-info/about-page", updateAboutpage);

// 🔑 RAZORPAY KEY ADD / UPDATE
router.post("/api/v1/app-info/razorpay-key", updateRazorpaytestKey);

router.post("/api/v1/app-info/razorpay-live-key", updateRazorpayliveKey);

router.post("/api/v1/app-info/zigo-app", updateZigoAppData)

// GET FULL APP INFO (Android, iOS, Policies everything)
router.get("/api/v1/app-info", getAppInfo);

  

module.exports = router;
