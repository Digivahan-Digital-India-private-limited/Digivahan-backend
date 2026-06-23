const User = require("../models/User");
const redis = require("../utils/redis.js");
const { generateOTP, generateTempUserId, sendOTP } = require("../utils/otpUtils");
const { ERROR_MESSAGES } = require("../../constants");
const { generateAuthToken } = require("../middleware/auth.js");
const ChallanWebhook = require("../models/ChallanWebhook");
const RTOChallanCache = require("../models/RTOChallanCache");
const RTOApiLog = require("../models/RTOApiLog");
const axios = require("axios");
const { getNoCreditsMessage } = require("../utils/creditUtils");


/**
 * Fetch real challans from RTO API (Kashidigital Challan Plus)
 */
const fetchRealChallans = async (rcNumber, userId = null, trigger = "challan_search") => {
  try {
    const url = process.env.RTO_CHALLAN_PLUS_URL || "https://core.kashidigitalapis.com/v1/challan-plus";
    console.log(`[ChallanFlow] Fetching challans for ${rcNumber} via ${url}`);

    const response = await axios.post(
      url,
      { rcNumber: rcNumber.toUpperCase() },
      {
        headers: {
          accessToken: process.env.RTO_API_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log(`[ChallanFlow] API Response for ${rcNumber}:`, JSON.stringify(response.data));

    // The API returns { statusCode: 200, data: [...] }
    if (response.data && (response.data.statusCode === 200 || response.data.statuscode === 200 || response.data.code === 200)) {
      // ✅ Log successful Challan Plus API call
      RTOApiLog.create({ userId, vehicleNumber: rcNumber, apiType: "challan_plus_api", trigger, success: true }).catch(() => { });
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    console.error("[ChallanFlow] Challan Plus API Error:", error.response?.data || error.message);
    return [];
  }
};

/**
 * Initialize Challan Flow - Step 1: Check user existence and send OTP
 * POST /api/challan-flow/init
 */
const initChallanFlow = async (req, res) => {
  try {
    const { phone, rcNumber } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Valid 10-digit phone number is required",
      });
    }

    const normalizedPhone = phone.trim();

    // Check if user exists
    let existingUser = await User.findOne({
      "basic_details.phone_number": normalizedPhone,
    }).select("is_active account_status blocked_reason");

    if (existingUser && existingUser.account_status === "DELETED") {
      await User.findByIdAndDelete(existingUser._id);
      existingUser = null;
    }

    // 🔥 BLOCKED check — no OTP sent to blocked users
    if (existingUser && existingUser.account_status === "BLOCKED") {
      return res.status(403).json({
        status: false,
        error_type: "blocked",
        message: "Your account has been blocked. You cannot use this service.",
        reason: existingUser.blocked_reason || "Blocked by admin",
      });
    }

    // 🔥 is_active check
    if (existingUser && !existingUser.is_active && existingUser.account_status !== "PENDING_DELETION") {
      return res.status(401).json({
        status: false,
        message: "Your account is deactivated.",
      });
    }

    const otpCode = generateOTP(6);
    const flowId = generateTempUserId();

    const flowData = {
      phone: normalizedPhone,
      rcNumber: rcNumber ? rcNumber.toUpperCase() : "",
      isNewUser: !existingUser,
      otp: otpCode,
    };

    await redis.set(`challanFlow:${flowId}`, JSON.stringify(flowData), "EX", 600);

    const otpSent = await sendOTP(normalizedPhone, otpCode, "PHONE", existingUser ? "login" : "signup");

    if (!otpSent) {
      await redis.del(`challanFlow:${flowId}`);
      return res.status(500).json({
        status: false,
        message: ERROR_MESSAGES.OTP_SEND_FAILED,
      });
    }

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      flow_id: flowId,
      is_new_user: !existingUser,
    });
  } catch (error) {
    console.error("Challan flow init error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Verify Challan OTP - Step 2: Verify OTP and create user if needed
 * POST /api/challan-flow/verify
 */
const verifyChallanOtp = async (req, res) => {
  try {
    const { flow_id, otp } = req.body;

    if (!flow_id || !otp) {
      return res.status(400).json({
        status: false,
        message: "Flow ID and OTP are required",
      });
    }

    const flowDataStr = await redis.get(`challanFlow:${flow_id}`);

    if (!flowDataStr) {
      console.warn(`[ChallanFlow] Flow ${flow_id} not found in Redis`);
      return res.status(400).json({
        status: false,
        message: "Invalid or expired session. Please try again.",
      });
    }

    const flowData = JSON.parse(flowDataStr);
    console.log(`[ChallanFlow] Verifying OTP. Expected: ${flowData.otp}, Received: ${otp}`);

    if (String(flowData.otp) !== String(otp)) {
      return res.status(400).json({
        status: false,
        message: "The OTP you entered is incorrect.",
      });
    }

    let user;
    if (flowData.isNewUser) {
      console.log(`[ChallanFlow] Creating new user for phone ${flowData.phone}`);
      const last4 = flowData.phone.slice(-4);
      const password = `User${last4}`;

      try {
        user = await User.create({
          basic_details: {
            first_name: "Challan",
            last_name: "User",
            phone_number: flowData.phone,
            password: password,
            phone_number_verified: true,
            is_phone_number_primary: true,
            profile_completion_percent: 20,
          },
          public_details: {
            nick_name: "Challan Guest",
          },
          is_active: true,
          is_tracking_on: true,
          account_status: "ACTIVE",
          challan_credits: 3, // New users start with 3 credits
          qr_list: [],
          garage: { vehicles: [] }
        });
      } catch (createError) {
        console.error("[ChallanFlow] User creation failed:", createError);
        return res.status(500).json({
          status: false,
          message: "Could not create user account: " + (createError.message || "Internal error"),
        });
      }
    } else {
      console.log(`[ChallanFlow] Fetching existing user for phone ${flowData.phone}`);
      user = await User.findOne({ "basic_details.phone_number": flowData.phone });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User account not found.",
        });
      }

      // 🔥 BLOCKED check at verify stage (double-safety)
      if (user.account_status === "BLOCKED") {
        await redis.del(`challanFlow:${flow_id}`);
        return res.status(403).json({
          status: false,
          error_type: "blocked",
          message: "Your account has been blocked. You cannot use this service.",
          reason: user.blocked_reason || "Blocked by admin",
        });
      }

      if (!user.is_active && user.account_status !== "PENDING_DELETION") {
        await redis.del(`challanFlow:${flow_id}`);
        return res.status(401).json({
          status: false,
          message: "Your account is deactivated.",
        });
      }

      if (!user.basic_details.phone_number_verified) {
        user.basic_details.phone_number_verified = true;
        await user.save();
      }
    }

    // 🪙 CREDIT CHECK — Only deduct if searching a NEW RC number
    const currentCredits = user.challan_credits ?? 3;
    let remainingCredits = currentCredits;
    let shouldDeduct = false;
    let userHasSearchRecord = false;

    if (flowData.rcNumber) {
      const cleanRc = flowData.rcNumber.toUpperCase().trim();
      
      // 1. Check if user already searched recently
      userHasSearchRecord = await ChallanWebhook.exists({ userId: user._id, rcNumber: cleanRc });
      
      // 2. Check if RC is in their garage
      if (!userHasSearchRecord && user.garage?.vehicles?.some(v => v.vehicle_id === cleanRc)) {
        userHasSearchRecord = true;
      }

      // 3. Check legacy API logs
      if (!userHasSearchRecord) {
        userHasSearchRecord = await RTOApiLog.exists({ userId: user._id, vehicleNumber: cleanRc });
      }

      if (!userHasSearchRecord) {
        shouldDeduct = true;
      }
    }

    if (shouldDeduct && currentCredits <= 0) {
      await redis.del(`challanFlow:${flow_id}`);
      return res.status(403).json({
        status: false,
        error_type: "no_credits",
        message: getNoCreditsMessage(),
        challan_credits: 0,
      });
    }

    if (shouldDeduct) {
      remainingCredits = Math.max(0, currentCredits - 1);
    }

    const token = generateAuthToken({
      user_id: user._id,
      email: user.basic_details.email || "",
      phone_number: user.basic_details.phone_number,
    });

    await User.updateOne(
      { _id: user._id },
      { $set: { is_logged_in: true, challan_credits: remainingCredits } }
    );
    await redis.del(`challanFlow:${flow_id}`);

    // Fetch Real Challans using new RTOChallanCache schema
    let realChallans = [];
    if (flowData.rcNumber) {
      try {
        // 1. Check if we have cached challans for this rcNumber from the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const cachedRecord = await RTOChallanCache.findOne({
          rcNumber: flowData.rcNumber,
          updatedAt: { $gte: oneDayAgo }
        }).lean();

        if (cachedRecord) {
          console.log(`[ChallanFlow] Using cached challans from RTOChallanCache for ${flowData.rcNumber}`);
          realChallans = cachedRecord.challans;
        } else {
          console.log(`[ChallanFlow] Fetching real challans for ${flowData.rcNumber} from API`);
          const fetchedChallans = await fetchRealChallans(flowData.rcNumber, user._id, "challan_search");

          if (fetchedChallans && fetchedChallans.length > 0) {
            const mappedChallans = fetchedChallans.map(challan => ({
              challanNumber: challan.challanNumber || challan.challan_number,
              offence: challan.offences?.[0]?.offence_name || challan.offence || "Traffic Violation",
              motorVehicleAct: challan.offences?.[0]?.motor_vehicle_act || "",
              amountSettledAt: parseInt(challan.challanAmount || challan.amount || 0),
              transactionStatus: ["cash", "paid", "online"].includes(challan.challanStatus?.toLowerCase()) ? "PAID" : "UNPAID",
              isSettled: ["cash", "paid", "online"].includes(challan.challanStatus?.toLowerCase()),
              location: challan.challanPlace || challan.location || "Unknown",
              createdAt: challan.challanDate || challan.createdAt || new Date().toISOString(),
              receiptLink: challan.receipt_url || challan.receiptLink || "",
              ownerName: challan.accusedName || challan.ownerName || challan.owner_name || "",
              ownerFatherName: challan.accusedFatherName || challan.ownerFatherName || challan.father_name || "",
              rcNumber: challan.rcNumber || flowData.rcNumber
            }));

            // Save to new Cache schema
            await RTOChallanCache.findOneAndUpdate(
              { rcNumber: flowData.rcNumber },
              { $set: { challans: mappedChallans } },
              { upsert: true, new: true }
            );

            realChallans = mappedChallans;
          } else {
            // Save empty array so we don't spam the API for 0 challan vehicles
            await RTOChallanCache.findOneAndUpdate(
              { rcNumber: flowData.rcNumber },
              { $set: { challans: [] } },
              { upsert: true, new: true }
            );
          }
        }

        // Add a single SEARCHED record into Webhook schema so user history tracks this search
        if (!userHasSearchRecord) {
          await ChallanWebhook.create({
            userId: user._id,
            rcNumber: flowData.rcNumber,
            transactionStatus: "SEARCHED",
          });
        }
      } catch (webhookError) {
        console.error("[ChallanFlow] Failed to fetch or cache real challans:", webhookError);
      }
    }

    const userResponse = {
      basic_details: {
        profile_pic: user.basic_details.profile_pic,
        first_name: user.basic_details.first_name,
        last_name: user.basic_details.last_name,
        phone_number: user.basic_details.phone_number,
        phone_number_verified: user.basic_details.phone_number_verified,
        is_phone_number_primary: user.basic_details.is_phone_number_primary,
        email: user.basic_details.email,
        is_email_verified: user.basic_details.is_email_verified,
        is_email_primary: user.basic_details.is_email_primary,
        profile_completion_percent: user.basic_details.profile_completion_percent,
      },
      public_details: user.public_details,
      is_tracking_on: user.is_tracking_on,
      token: token,
      challans: realChallans, // Return real challans to frontend
      challan_credits: remainingCredits, // 🪙 Include remaining credits
    };

    return res.status(200).json({
      status: true,
      message: flowData.isNewUser ? "Account created and verified successfully!" : "Verification successful!",
      user: userResponse,
    });
  } catch (error) {
    console.error("[ChallanFlow] Critical verify error:", error);
    return res.status(500).json({
      status: false,
      message: "An internal server error occurred during verification.",
    });
  }
};

/**
 * Get Challan History - Fetches webhook records for the logged-in user
 * GET /api/challan-flow/history
 */
const getChallanHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access",
      });
    }

    // 1. Get all records directly linked to this user (SEARCHED records)
    const userRecords = await ChallanWebhook.find({ userId }).sort({ createdAt: -1 });

    // 2. Extract unique rcNumbers from the user's records
    const userRcNumbers = [...new Set(userRecords.map(r => r.rcNumber).filter(Boolean))];

    // 3. Get all webhook payment records for those rcNumbers (these come from external
    //    payment provider and don't have userId set, so we match by rcNumber)
    let webhookPaymentRecords = [];
    if (userRcNumbers.length > 0) {
      webhookPaymentRecords = await ChallanWebhook.find({
        rcNumber: { $in: userRcNumbers },
        userId: { $exists: false },  // These are external webhook records (no userId)
        transactionStatus: { $ne: "SEARCHED" },
        challanNumber: { $exists: true, $ne: "" }
      }).sort({ createdAt: -1 });
    }

    // 4. Merge: user records (for vehicle list) + webhook payment records
    const allRecords = [...userRecords, ...webhookPaymentRecords];

    return res.status(200).json({
      status: true,
      message: "Challan history fetched successfully",
      history: allRecords,
    });
  } catch (error) {
    console.error("[ChallanFlow] Error fetching history:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Get Payment URL for Challan
 * POST /api/challan-flow/payment-url
 */
const getChallanPaymentUrl = async (req, res) => {
  try {
    const { vehicleNumber, challanNumbers } = req.body;

    if (!vehicleNumber || !challanNumbers) {
      return res.status(400).json({
        status: false,
        message: "Vehicle number and challan numbers are required",
      });
    }

    const cleanVehicleNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '');
    console.log(`[ChallanFlow] Generating payment URL for ${cleanVehicleNumber}, challans:`, challanNumbers);

    // Using Invincible Ocean API for payment URL as requested
    const response = await axios.post(
      "https://api.invincibleocean.com/invincible/vehicle-echallan-custom",
      // "https://api.dev.invincibleocean.com/invincible/vehicle-echallan-custom",
      {
        vehicleNumber: cleanVehicleNumber,
        challanNumber: Array.isArray(challanNumbers) ? challanNumbers : [challanNumbers],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "secretKey": process.env.INVINCIBLE_SECRET_KEY,
          "clientId": process.env.INVINCIBLE_CLIENT_ID
        },
        timeout: 30000
      }
    );

    let paymentUrl = response.data?.url || response.data?.paymentUrl;

    if (paymentUrl && typeof paymentUrl === "string") {
      try {
        const decoded = JSON.parse(paymentUrl);
        if (typeof decoded === "string") {
          paymentUrl = decoded;
        }
      } catch (e) { }
    }

    if (!paymentUrl) {
      console.error("[ChallanFlow] Payment URL not found in API response:", response.data);
      return res.status(500).json({
        status: false,
        message: "Failed to generate payment URL. Please try again later.",
        details: response.data
      });
    }

    if (paymentUrl.toLowerCase().includes("<!doctype html>") || paymentUrl.toLowerCase().includes("<html")) {
      const checkoutId = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await redis.set(checkoutId, paymentUrl, "EX", 1800); // 30 minutes

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const finalUrl = `${baseUrl}/api/challan-flow/render-checkout/${checkoutId}`;

      return res.status(200).json({
        status: true,
        message: "Payment URL generated successfully",
        paymentUrl: finalUrl,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Payment URL generated successfully",
      paymentUrl,
    });
  } catch (error) {
    console.error("[ChallanFlow] Error getting payment URL:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.response?.data?.error || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    return res.status(error.response?.status || 500).json({
      status: false,
      message: errorMessage,
      details: error.response?.data || error.message
    });
  }
};

const refreshChallans = async (req, res) => {
  try {
    const { rcNumber } = req.body;
    const userId = req.user?.userId || null;

    if (!rcNumber) {
      return res.status(400).json({ status: false, message: "RC Number is required" });
    }

    // 🔥 BLOCKED or DELETED check + 🪙 CREDIT CHECK
    let refreshUser = null;
    if (userId) {
      refreshUser = await User.findById(userId).select("account_status blocked_reason challan_credits");
      if (refreshUser && refreshUser.account_status === "BLOCKED") {
        return res.status(403).json({
          status: false,
          error_type: "blocked",
          message: "Your account has been blocked. You cannot use this service.",
          reason: refreshUser.blocked_reason || "Blocked by admin",
        });
      }

      if (refreshUser && refreshUser.account_status === "DELETED") {
        return res.status(401).json({
          status: false,
          error_type: "user_deleted",
          message: "User account is deleted.",
        });
      }

      const refreshCredits = refreshUser?.challan_credits ?? 3;
      if (refreshCredits <= 0) {
        return res.status(403).json({
          status: false,
          error_type: "no_credits",
          message: getNoCreditsMessage(),
          challan_credits: 0,
        });
      }
    }

    console.log(`[ChallanFlow] Refreshing real challans for ${rcNumber} from API`);
    const fetchedChallans = await fetchRealChallans(rcNumber, userId, "challan_refresh");

    let realChallans = [];
    if (fetchedChallans && fetchedChallans.length > 0) {
      realChallans = fetchedChallans.map(challan => ({
        challanNumber: challan.challanNumber || challan.challan_number,
        offence: challan.offences?.[0]?.offence_name || challan.offence || "Traffic Violation",
        motorVehicleAct: challan.offences?.[0]?.motor_vehicle_act || "",
        amountSettledAt: parseInt(challan.challanAmount || challan.amount || 0),
        transactionStatus: ["cash", "paid", "online"].includes(challan.challanStatus?.toLowerCase()) ? "PAID" : "UNPAID",
        isSettled: ["cash", "paid", "online"].includes(challan.challanStatus?.toLowerCase()),
        location: challan.challanPlace || challan.location || "Unknown",
        createdAt: challan.challanDate || challan.createdAt || new Date().toISOString(),
        receiptLink: challan.receipt_url || challan.receiptLink || "",
        ownerName: challan.accusedName || challan.ownerName || challan.owner_name || "",
        ownerFatherName: challan.accusedFatherName || challan.ownerFatherName || challan.father_name || "",
        rcNumber: challan.rcNumber || rcNumber
      }));
    }

    // Overwrite realChallans status with real-time webhook status
    const webhookRecords = await ChallanWebhook.find({
      rcNumber: rcNumber,
      transactionStatus: { $ne: "SEARCHED" }
    }).sort({ createdAt: -1 }).lean();

    if (realChallans.length > 0 && webhookRecords.length > 0) {
      realChallans = realChallans.map(challan => {
        const wh = webhookRecords.find(r => r.challanNumber === challan.challanNumber);
        if (wh) {
          let overrideStatus = challan.transactionStatus;
          const txStatus = wh.transactionStatus?.toLowerCase();
          const ioStatus = wh.ioStatus?.toLowerCase();

          if (txStatus === 'success' || txStatus === 'paid' || (txStatus === 'captured' && wh.isSettled)) {
            overrideStatus = "PAID";
          } else if (txStatus === 'captured' && overrideStatus !== "PAID") {
            overrideStatus = "UNDER_PROCESS";
          } else if (txStatus === 'failed' && ioStatus === 'refund' && overrideStatus !== "PAID") {
            overrideStatus = "UNPAID";
          } else if (txStatus === 'initiated' && overrideStatus !== "PAID") {
            overrideStatus = "UNPAID";
          }
          return {
            ...challan,
            transactionStatus: overrideStatus,
            isSettled: overrideStatus === "PAID",
            _webhookRecord: wh
          };
        }
        return {
          ...challan,
          isSettled: challan.transactionStatus === "PAID" || challan.isSettled
        };
      });
    } else if (realChallans.length > 0) {
      realChallans = realChallans.map(challan => ({
        ...challan,
        isSettled: challan.transactionStatus === "PAID" || challan.isSettled
      }));
    }

    if (realChallans.length > 0) {
      await RTOChallanCache.findOneAndUpdate(
        { rcNumber },
        { $set: { challans: realChallans } },
        { upsert: true, new: true }
      );
    } else {
      await RTOChallanCache.findOneAndUpdate(
        { rcNumber },
        { $set: { challans: [] } },
        { upsert: true, new: true }
      );
    }

    // 🪙 Deduct 1 credit after successful refresh
    // Use $set with computed value (not $inc) to avoid MongoDB creating
    // the field as -1 when it doesn't exist on legacy users
    let refreshRemainingCredits = null;
    if (userId && refreshUser) {
      const currentRefreshCredits = refreshUser.challan_credits ?? 3;
      refreshRemainingCredits = Math.max(0, currentRefreshCredits - 1);
      await User.updateOne({ _id: userId }, { $set: { challan_credits: refreshRemainingCredits } });
    }

    return res.status(200).json({
      status: true,
      message: "Challans refreshed successfully",
      challans: realChallans,
      challan_credits: refreshRemainingCredits, // 🪙 Include remaining credits
    });
  } catch (error) {
    console.error("[ChallanFlow] Refresh error:", error);
    return res.status(500).json({ status: false, message: "Failed to refresh challans" });
  }
};

const directSearchChallans = async (req, res) => {
  try {
    const { rcNumber } = req.body;
    if (!rcNumber) {
      return res.status(400).json({ status: false, message: "RC Number is required" });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId).select(
      "basic_details public_details is_tracking_on account_status blocked_reason is_active challan_credits"
    );
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // 🔥 BLOCKED or DELETED check — deny API access
    if (user.account_status === "BLOCKED") {
      return res.status(403).json({
        status: false,
        error_type: "blocked",
        message: "Your account has been blocked. You cannot use this service.",
        reason: user.blocked_reason || "Blocked by admin",
      });
    }

    if (user.account_status === "DELETED") {
      return res.status(401).json({
        status: false,
        error_type: "user_deleted",
        message: "User account is deleted.",
      });
    }

    const cleanRc = rcNumber.toUpperCase().trim();

    // 🪙 CREDIT CHECK — deny if no credits left and it's a NEW RC search
    const directCredits = user.challan_credits ?? 3;
    
    // 1. Check if user already searched recently
    let userHasSearchRecord = await ChallanWebhook.exists({ userId: user._id, rcNumber: cleanRc });
    
    // 2. Check if RC is in their garage
    if (!userHasSearchRecord && user.garage?.vehicles?.some(v => v.vehicle_id === cleanRc)) {
      userHasSearchRecord = true;
    }

    // 3. Check legacy API logs
    if (!userHasSearchRecord) {
      userHasSearchRecord = await RTOApiLog.exists({ userId: user._id, vehicleNumber: cleanRc });
    }

    if (!userHasSearchRecord && directCredits <= 0) {
      return res.status(403).json({
        status: false,
        error_type: "no_credits",
        message: getNoCreditsMessage(),
        challan_credits: 0,
      });
    }

    // 1. Fetch from Cache or API
    let realChallans = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cachedRecord = await RTOChallanCache.findOne({
      rcNumber: cleanRc,
      updatedAt: { $gte: oneDayAgo }
    }).lean();

    if (cachedRecord) {
      console.log(`[ChallanFlow] Using cached challans from RTOChallanCache for ${cleanRc}`);
      realChallans = cachedRecord.challans;
    } else {
      console.log(`[ChallanFlow] Fetching real challans for ${cleanRc} from API`);
      const fetchedChallans = await fetchRealChallans(cleanRc, user._id, "challan_search");
      if (fetchedChallans && fetchedChallans.length > 0) {
        realChallans = fetchedChallans.map(challan => ({
          challanNumber: challan.challanNumber || challan.challan_number,
          offence: challan.offences?.[0]?.offence_name || challan.offence || "Traffic Violation",
          motorVehicleAct: challan.offences?.[0]?.motor_vehicle_act || "",
          amountSettledAt: parseInt(challan.challanAmount || challan.amount || 0),
          transactionStatus: ["cash", "paid", "online"].includes(challan.challanStatus?.toLowerCase()) ? "PAID" : "UNPAID",
          isSettled: ["cash", "paid", "online"].includes(challan.challanStatus?.toLowerCase()),
          location: challan.challanPlace || challan.location || "Unknown",
          createdAt: challan.challanDate || challan.createdAt || new Date().toISOString(),
          receiptLink: challan.receipt_url || challan.receiptLink || "",
          ownerName: challan.accusedName || challan.ownerName || challan.owner_name || "",
          ownerFatherName: challan.accusedFatherName || challan.ownerFatherName || challan.father_name || "",
          rcNumber: challan.rcNumber || cleanRc
        }));

        await RTOChallanCache.findOneAndUpdate(
          { rcNumber: cleanRc },
          { $set: { challans: realChallans } },
          { upsert: true, new: true }
        );
      } else {
        await RTOChallanCache.findOneAndUpdate(
          { rcNumber: cleanRc },
          { $set: { challans: [] } },
          { upsert: true, new: true }
        );
      }
    }

    // Overwrite realChallans status with real-time webhook status
    const webhookRecords = await ChallanWebhook.find({
      rcNumber: cleanRc,
      transactionStatus: { $ne: "SEARCHED" }
    }).sort({ createdAt: -1 }).lean();

    if (realChallans.length > 0 && webhookRecords.length > 0) {
      realChallans = realChallans.map(challan => {
        const wh = webhookRecords.find(r => r.challanNumber === challan.challanNumber);
        if (wh) {
          let overrideStatus = challan.transactionStatus;
          const txStatus = wh.transactionStatus?.toLowerCase();
          const ioStatus = wh.ioStatus?.toLowerCase();

          if (txStatus === 'success' || txStatus === 'paid' || (txStatus === 'captured' && wh.isSettled)) {
            overrideStatus = "PAID";
          } else if (txStatus === 'captured' && overrideStatus !== "PAID") {
            overrideStatus = "UNDER_PROCESS";
          } else if (txStatus === 'failed' && ioStatus === 'refund' && overrideStatus !== "PAID") {
            overrideStatus = "UNPAID";
          } else if (txStatus === 'initiated' && overrideStatus !== "PAID") {
            overrideStatus = "UNPAID";
          }

          return {
            ...challan,
            transactionStatus: overrideStatus,
            isSettled: overrideStatus === "PAID",
            _webhookRecord: wh
          };
        }
        return {
          ...challan,
          isSettled: challan.transactionStatus === "PAID" || challan.isSettled
        };
      });
    } else if (realChallans.length > 0) {
      realChallans = realChallans.map(challan => ({
        ...challan,
        isSettled: challan.transactionStatus === "PAID" || challan.isSettled
      }));
    }

    // Add SEARCHED record in webhook schema
    let directRemainingCredits = directCredits;
    if (!userHasSearchRecord) {
      await ChallanWebhook.create({
        userId: user._id,
        rcNumber: cleanRc,
        transactionStatus: "SEARCHED",
      });

      // 🪙 Deduct 1 credit after successful search for a NEW RC
      directRemainingCredits = Math.max(0, directCredits - 1);
      await User.updateOne({ _id: userId }, { $set: { challan_credits: directRemainingCredits } });
    }

    return res.status(200).json({
      status: true,
      message: "Challans fetched successfully",
      challans: realChallans,
      challan_credits: directRemainingCredits, // 🪙 Include remaining credits
      user: {
        basic_details: {
          phone_number: user.basic_details.phone_number,
          first_name: user.basic_details.first_name,
          last_name: user.basic_details.last_name,
        }
      }
    });
  } catch (error) {
    console.error("Direct search error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch challans" });
  }
};

const renderCheckoutHtml = async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const html = await redis.get(checkoutId);

    if (!html) {
      return res.status(404).send("<h2>Checkout session expired or not found. Please try again.</h2>");
    }

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  } catch (error) {
    console.error("[ChallanFlow] Error rendering checkout:", error);
    return res.status(500).send("<h2>Internal server error.</h2>");
  }
};

/**
 * GET /api/challan-flow/credits
 * Returns the current challan_credits for the logged-in user.
 * Returns 401 if user not found or deleted → frontend uses this to clear stale localStorage.
 */
const getChallanCredits = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("challan_credits account_status");
    if (!user || user.account_status === "DELETED") {
      // Return 401 so frontend knows to clear stale data
      return res.status(401).json({ status: false, error_type: "user_deleted", message: "User not found or deleted" });
    }

    // Always return a non-negative value (guards against legacy $inc -1 bug)
    const safeCredits = Math.max(0, user.challan_credits ?? 3);

    // If DB has a negative value (legacy bug), fix it silently
    if ((user.challan_credits ?? 3) < 0) {
      await User.updateOne({ _id: userId }, { $set: { challan_credits: safeCredits } });
    }

    return res.status(200).json({
      status: true,
      challan_credits: safeCredits,
      user_id: userId,
    });
  } catch (error) {
    console.error("[ChallanFlow] getChallanCredits error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch credits" });
  }
};

module.exports = {
  initChallanFlow,
  verifyChallanOtp,
  getChallanHistory,
  getChallanPaymentUrl,
  refreshChallans,
  directSearchChallans,
  renderCheckoutHtml,
  getChallanCredits,
};
