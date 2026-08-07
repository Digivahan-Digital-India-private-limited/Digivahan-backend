const mongoose = require("mongoose");
const User = require("../models/User");
const QRAssignment = require("../models/QRAssignment");
const VehicleInfoData = require("../models/vehicleInfoSchema");
const RTOApiLog = require("../models/RTOApiLog");
const axios = require("axios");
const redis = require("../utils/redis");
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require("../../constants");
const {
  maskName,
  maskVehicleNumber,
  maskAlphaNumeric,
} = require("../utils/maskData");
const ChallanWebhook = require("../models/ChallanWebhook");
const VehicleForAdd = require("../models/VehicleForAdd");
const RTOChallanCache = require("../models/RTOChallanCache");
const { getNoCreditsMessage } = require("../utils/creditUtils");

/**
 * Add Vehicle to Garage - Fetch vehicle data from RTO and save to user's garage
 * POST /api/v1/garage/add-vehicle
 */
const addVehicle = async (req, res) => {
  try {
    const { vehicle_number } = req.body;
    // userId from auth middleware (may be undefined for public calls)
    const userId = req.user?.userId || null;

    if (!vehicle_number) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    let user = null;
    let remainingCredits = null;

    // ─── Step 1: Account status check ────────────────────────────────────────
    if (userId) {
      user = await User.findById(userId).select("account_status blocked_reason challan_credits garage");

      if (user && user.account_status === "BLOCKED") {
        return res.status(403).json({
          status: false,
          error_type: "blocked",
          message: "Your account has been blocked. You cannot use this service.",
          reason: user.blocked_reason || "Blocked by admin",
        });
      }

      if (user && user.account_status === "DELETED") {
        return res.status(401).json({
          status: false,
          error_type: "user_deleted",
          message: "User account is deleted.",
        });
      }
    }

    // ─── Step 2: DB cache check FIRST — NO credit deducted if data exists ────
    // If this vehicle number is already in our VehicleInfoData collection,
    // return immediately without touching credits.
    const cachedVehicle = await VehicleInfoData.findOne({
      vehicle_id: vehicle_number,
    }).lean();

    if (cachedVehicle) {
      if (user) {
        remainingCredits = user.challan_credits ?? 3;
      }
      return res.status(200).json({
        status: true,
        message: SUCCESS_MESSAGES.GARAGE_RETRIEVED_SUCCESSFULLY,
        data: {
          result: maskVehicleResponse(cachedVehicle.api_data),
          data_source: cachedVehicle.data_source,
        },
        challan_credits: remainingCredits,
      });
    }

    // ─── Step 3: Vehicle NOT in DB — credit check before calling external API ─
    let deductCredit = false;

    if (userId && user) {
      const cleanRc = vehicle_number.toUpperCase().trim();
      const directCredits = user.challan_credits ?? 3;

      // Check if user has any prior record for this vehicle number
      let userHasSearchRecord = false;
      userHasSearchRecord = await ChallanWebhook.exists({ userId: user._id, rcNumber: cleanRc });

      if (!userHasSearchRecord && user.garage?.vehicles?.some(v => v.vehicle_id === cleanRc)) {
        userHasSearchRecord = true;
      }
      if (!userHasSearchRecord) {
        userHasSearchRecord = await RTOApiLog.exists({ userId: user._id, vehicleNumber: cleanRc });
      }

      if (!userHasSearchRecord) {
        // Completely new search for both user + DB → deduct credit
        if (directCredits <= 0) {
          return res.status(403).json({
            status: false,
            error_type: "no_credits",
            message: getNoCreditsMessage(),
            challan_credits: 0,
          });
        }
        deductCredit = true;
        remainingCredits = directCredits - 1;
      } else {
        remainingCredits = directCredits;
      }
    }

    // ─── Step 4: Fetch from external RTO API (real cost) ─────────────────────
    let rtoData;
    let dataSource = "rto_api";

    try {
      rtoData = await fetchVehicleDataFromRTO(vehicle_number, userId, "add_vehicle");
    } catch (error) {
      if (error.statusCode === 500) {
        rtoData = await fetchVehicleDataFromRTOPremimumApi(vehicle_number, userId, "add_vehicle");
        dataSource = "rto_premium_api";
      } else {
        throw error;
      }
    }

    const vehicleData = transformRTODataToVehicleSchema(rtoData, vehicle_number);

    // Cache in DB so future lookups are free (no credit deduction)
    await VehicleInfoData.create({
      vehicle_id: vehicle_number,
      api_data: vehicleData,
      data_source: dataSource,
    });

    // Deduct credit only for a brand-new vehicle + new user search
    if (deductCredit && userId) {
      await User.updateOne({ _id: userId }, { $set: { challan_credits: remainingCredits } });
    }

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.GARAGE_RETRIEVED_SUCCESSFULLY,
      data: {
        result: maskVehicleResponse(vehicleData),
        data_source: dataSource,
      },
      challan_credits: remainingCredits,
    });
  } catch (error) {
    console.error("Add vehicle error:", error);
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};


const maskVehicleResponse = (data) => {
  if (!data) return data;

  const custom = data.custom_vehicle_info || {};
  const rto = data.rto_data || {};

  return {
    ...data,

    custom_vehicle_info: {
      ...custom,
      owner_name: custom.owner_name
        ? maskName(custom.owner_name)
        : custom.owner_name,

      vehicle_number: custom.vehicle_number,

      engine: custom.engine ? maskAlphaNumeric(custom.engine) : custom.engine,

      chassis_number: custom.chassis_number
        ? maskAlphaNumeric(custom.chassis_number)
        : custom.chassis_number,

      insurance_policy_number: custom.insurance_policy_number
        ? maskAlphaNumeric(custom.insurance_policy_number)
        : custom.insurance_policy_number,
      category: custom.category || rto.vehicle?.category || "N/A",
    },

    rto_data: {
      ...rto,

      registration: rto.registration
        ? {
          ...rto.registration,
          number: rto.registration.number
            ? maskVehicleNumber(rto.registration.number)
            : rto.registration.number,

          owner: rto.registration.owner
            ? {
              ...rto.registration.owner,
              name: rto.registration.owner.name
                ? maskName(rto.registration.owner.name)
                : rto.registration.owner.name,

              fatherName: rto.registration.owner.fatherName
                ? maskName(rto.registration.owner.fatherName)
                : rto.registration.owner.fatherName,

              presentAddress: "******",
              permanentAddress: "******",
            }
            : rto.registration.owner,
        }
        : rto.registration,

      vehicle: rto.vehicle
        ? {
          ...rto.vehicle,
          engine: rto.vehicle.engine
            ? maskAlphaNumeric(rto.vehicle.engine)
            : rto.vehicle.engine,

          chassis: rto.vehicle.chassis
            ? maskAlphaNumeric(rto.vehicle.chassis)
            : rto.vehicle.chassis,
        }
        : rto.vehicle,

      insurance: rto.insurance
        ? {
          ...rto.insurance,
          policyNumber: rto.insurance.policyNumber
            ? maskAlphaNumeric(rto.insurance.policyNumber)
            : rto.insurance.policyNumber,
        }
        : rto.insurance,

      pollutionControl: rto.pollutionControl
        ? {
          ...rto.pollutionControl,
          certificateNumber: rto.pollutionControl.certificateNumber
            ? maskAlphaNumeric(rto.pollutionControl.certificateNumber)
            : rto.pollutionControl.certificateNumber,
        }
        : rto.pollutionControl,
    },
  };
};

/**
 * Normalize RTO data from both old (Kashi/STAK) and new (Invincible RC V6) APIs
 * Ensures both nested properties (registration, vehicle, insurance, etc.) and flat properties exist.
 */
const normalizeRTOData = (resData) => {
  if (!resData) return {};
  const data = resData.data && typeof resData.data === "object" && !Array.isArray(resData.data)
    ? resData.data
    : resData;

  const regNumber = data.regNo || data.vehicleNumber || data.rcNumber || data.registration?.number || "";
  const ownerName = data.owner || data.ownerName || data.registration?.owner?.name || "";
  const ownerFatherName = data.ownerFatherName || data.fatherName || data.registration?.owner?.fatherName || "";
  const regDate = data.regDate || data.registrationDate || data.registration?.date || null;
  const ownerCount = data.ownerCount || data.registration?.ownerCount || "1";
  const authority = data.regAuthority || data.authority || data.registration?.authority || "N/A";
  const isActive = (data.status || "").toUpperCase() === "ACTIVE" || data.registration?.status?.active || false;
  const regExpiry = data.rcExpiryDate || data.expiryDate || data.registration?.expiryDate || null;

  const manufacturer = data.vehicleManufacturerName || data.manufacturer || data.vehicle?.manufacturer || "Unknown";
  const model = data.model || data.vehicle?.model || "Model";
  const vehicleClass = data.class || data.vehicleClass || data.vehicle?.class || "N/A";
  const fuelType = data.type || data.fuelType || data.vehicle?.fuelType || "N/A";
  const normsType = data.normsType || data.fuelNorms || data.vehicle?.normsType || "N/A";
  const engine = data.engine || data.vehicle?.engine || "N/A";
  const chassis = data.chassis || data.chassisNumber || data.vehicle?.chassis || "N/A";
  const color = data.vehicleColour || data.color || data.vehicle?.color || "N/A";
  const unladenWeight = data.unladenWeight || data.vehicle?.unladenWeight || "0";
  const category = data.vehicleCategory || data.category || data.vehicle?.category || "N/A";
  const manufacturingYear = data.vehicleManufacturingMonthYear || data.manufacturingYear || data.vehicle?.manufacturingYear || "";
  const fitnessUpTo = data.rcExpiryDate || data.vehicleTaxUpto || data.fitnessUpto || data.vehicle?.fitnessUpTo || null;

  const insCompany = data.vehicleInsuranceCompanyName || data.insuranceCompany || data.insurance?.company || "N/A";
  const insExpiry = data.vehicleInsuranceUpto || data.insuranceExpiry || data.insurance?.expiryDate || null;
  const insPolicy = data.vehicleInsurancePolicyNumber || data.insurancePolicyNumber || data.insurance?.policyNumber || "N/A";

  const puccValidUpto = data.puccUpto || data.pollutionExpiry || data.pollutionControl?.validUpto || null;
  const puccCertNo = data.puccNumber || data.pollutionCertificate || data.pollutionControl?.certificateNumber || "N/A";

  const isFinanced = data.financed !== undefined ? data.financed : (data.finance?.isFinanced || false);
  const rcFinancer = data.rcFinancer || data.financerName || data.finance?.rcFinancer || "";

  return {
    ...resData,
    ...data,
    regNo: regNumber,
    vehicleNumber: regNumber,
    owner: ownerName,
    ownerFatherName: ownerFatherName,
    model: model,
    engine: engine,
    chassis: chassis,
    registration: {
      ...(data.registration || {}),
      number: regNumber,
      date: regDate,
      ownerCount: String(ownerCount),
      authority: authority,
      status: {
        active: isActive,
        ...(data.registration?.status || {})
      },
      expiryDate: regExpiry,
      owner: {
        ...(data.registration?.owner || {}),
        name: ownerName,
        fatherName: ownerFatherName,
        presentAddress: data.presentAddress || data.registration?.owner?.presentAddress || "",
        permanentAddress: data.permanentAddress || data.registration?.owner?.permanentAddress || ""
      }
    },
    vehicle: {
      ...(data.vehicle || {}),
      manufacturer: manufacturer,
      model: model,
      class: vehicleClass,
      fuelType: fuelType,
      normsType: normsType,
      engine: engine,
      chassis: chassis,
      color: color,
      unladenWeight: unladenWeight,
      category: category,
      manufacturingYear: manufacturingYear,
      fitnessUpTo: fitnessUpTo
    },
    insurance: {
      ...(data.insurance || {}),
      company: insCompany,
      expiryDate: insExpiry,
      policyNumber: insPolicy
    },
    pollutionControl: {
      ...(data.pollutionControl || {}),
      validUpto: puccValidUpto,
      certificateNumber: puccCertNo
    },
    finance: {
      ...(data.finance || {}),
      isFinanced: isFinanced,
      rcFinancer: rcFinancer
    }
  };
};

/**
 * Fetch vehicle data from RTO API (Invincible RC V6)
 * Makes actual API call to RTO service
 */
const fetchVehicleDataFromRTO = async (vehicleNumber, userId = null, trigger = "add_vehicle") => {
  const url = process.env.INVINCIBLE_RC_API_URL || "https://api-prod.kyc-flow.com/vehicleRcV6";
  console.log("➡️ Calling RTO RC API:", url);

  try {
    const response = await axios.post(
      url,
      {
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        consent: "I explicitly consent to the collection, processing, and verification of my data for authentication, KYC, and compliance purposes."
      },
      {
        headers: {
          clientId: process.env.INVINCIBLE_CLIENT_ID,
          secretKey: process.env.INVINCIBLE_SECRET_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    if (response.status === 200 && (response.data.code === 200 || response.data.statusCode === 200 || response.data.statuscode === 200 || response.data.status === "success")) {
      // ✅ Log successful API call
      RTOApiLog.create({ userId, vehicleNumber, apiType: "rto_api", trigger, success: true }).catch(() => { });
      return normalizeRTOData(response.data.result || response.data.data || response.data);
    }

    const isApiNoData = response.data?.code === 500 || response.data?.statusCode === 500 || (response.data?.message || "").toLowerCase().includes("contact support");
    if (isApiNoData && vehicleNumber) {
      VehicleForAdd.findOneAndUpdate(
        { vehicleNumber: vehicleNumber.toUpperCase().trim() },
        {
          $inc: { failCount: 1 },
          $set: { lastFailedAt: new Date() },
          $setOnInsert: { isDownloaded: false },
        },
        { upsert: true, new: true }
      ).catch((e) => console.error("[VehicleForAdd] Failed to save:", e.message));
    }

    const err = new Error(response.data?.message || "NORMAL_RTO_FAILED");
    err.statusCode = response.data?.code || response.data?.statusCode || 500;
    throw err;
  } catch (error) {
    if (error.response) {
      const errDataStr = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data || "");
      const errMsgStr = error.message || "";
      const isApiNoData = errDataStr.toLowerCase().includes("sorry for inconvenience") || errMsgStr.toLowerCase().includes("sorry for inconvenience");

      if (isApiNoData && vehicleNumber) {
        VehicleForAdd.findOneAndUpdate(
          { vehicleNumber: vehicleNumber.toUpperCase().trim() },
          {
            $inc: { failCount: 1 },
            $set: { lastFailedAt: new Date() },
            $addToSet: { failedApis: "VEHICLE" },
            $setOnInsert: { isDownloaded: false },
          },
          { upsert: true, new: true }
        ).catch((e) => console.error("[VehicleForAdd] Failed to save:", e.message));
      }
    }

    console.error("❌ RTO RC API error:", error.response?.data || error.message);
    if (error.response?.data) {
      console.error("❌ ACTUAL API ERROR MSG (RTO):", JSON.stringify(error.response.data, null, 2));
    }
    const err = new Error(error.response?.data?.message || error.message || "NORMAL_RTO_FAILED");
    err.statusCode = error.response?.status || 500;
    throw err;
  }
};

const fetchVehicleDataFromRTOPremimumApi = async (vehicleNumber, userId = null, trigger = "add_vehicle") => {
  const url = process.env.INVINCIBLE_RC_API_URL || "https://api-prod.kyc-flow.com/vehicleRcV6";
  console.log("➡️ Calling PREMIUM RTO RC API for:", vehicleNumber, "via", url);

  let response;
  try {
    response = await axios.post(
      url,
      {
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        consent: "I explicitly consent to the collection, processing, and verification of my data for authentication, KYC, and compliance purposes."
      },
      {
        headers: {
          clientId: process.env.INVINCIBLE_CLIENT_ID,
          secretKey: process.env.INVINCIBLE_SECRET_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );
  } catch (axiosError) {
    console.error("❌ PREMIUM RTO Axios error:", {
      code: axiosError.code,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      message: axiosError.message,
    });
    if (axiosError.response?.data) {
      console.error("❌ ACTUAL PREMIUM API ERROR MSG (RTO):", JSON.stringify(axiosError.response.data, null, 2));
    }

    if (axiosError.code === "ECONNABORTED") {
      const err = new Error("Premium RTO API timeout");
      err.statusCode = 504;
      throw err;
    }

    if (axiosError.response) {
      const errDataStr = typeof axiosError.response.data === "string" ? axiosError.response.data : JSON.stringify(axiosError.response.data || "");
      const errMsgStr = axiosError.message || "";
      const isApiNoData = errDataStr.toLowerCase().includes("sorry for inconvenience") || errMsgStr.toLowerCase().includes("sorry for inconvenience");

      if (isApiNoData && vehicleNumber) {
        VehicleForAdd.findOneAndUpdate(
          { vehicleNumber: vehicleNumber.toUpperCase().trim() },
          {
            $inc: { failCount: 1 },
            $set: { lastFailedAt: new Date() },
            $addToSet: { failedApis: "VEHICLE" },
            $setOnInsert: { isDownloaded: false },
          },
          { upsert: true, new: true }
        ).catch((e) => console.error("[VehicleForAdd] Failed to save:", e.message));
      }

      const err = new Error(
        axiosError.response.data?.message ||
        axiosError.response.statusText ||
        "Premium RTO API error",
      );
      err.statusCode = axiosError.response.status;
      throw err;
    }

    const err = new Error(axiosError.message || "Premium RTO unavailable");
    err.statusCode = 502;
    throw err;
  }

  console.log("⬅️ PREMIUM RTO API response:", {
    httpStatus: response.status,
    statusCode: response.data?.statusCode || response.data?.code,
    message: response.data?.message,
    hasResult: !!response.data?.result,
  });

  if (response.status === 200 && (response.data.code === 200 || response.data.statusCode === 200 || response.data.statuscode === 200 || response.data.status === "success")) {
    // ✅ Log successful premium API call
    RTOApiLog.create({ userId, vehicleNumber, apiType: "rto_premium_api", trigger, success: true }).catch(() => { });
    return normalizeRTOData(response.data.result || response.data.data || response.data);
  }

  const errDataStr = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
  const errMsgStr = response.statusText || "";
  const isApiNoData = errDataStr.toLowerCase().includes("sorry for inconvenience") || errMsgStr.toLowerCase().includes("sorry for inconvenience");
  if (isApiNoData && vehicleNumber) {
    VehicleForAdd.findOneAndUpdate(
      { vehicleNumber: vehicleNumber.toUpperCase().trim() },
      {
        $inc: { failCount: 1 },
        $set: { lastFailedAt: new Date() },
        $addToSet: { failedApis: "VEHICLE" },
        $setOnInsert: { isDownloaded: false },
      },
      { upsert: true, new: true }
    ).catch((e) => console.error("[VehicleForAdd] Failed to save:", e.message));
  }

  const err = new Error(response.data?.message || "Premium RTO API failed");
  err.statusCode = response.data?.code || response.data?.statusCode || 500;
  throw err;
};

// Add vehicle in User Garage
const addVehicleInUsergarage = async (req, res) => {
  try {
    const { user_id, vehicle_number, owner_name } = req.body;

    if (!vehicle_number || !owner_name) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 1️⃣ Duplicate check (FAST)
    const alreadyExists = await User.findOne({
      _id: user_id,
      "garage.vehicles.vehicle_id": vehicle_number,
    }).select("_id");

    if (alreadyExists) {
      return res.status(400).json({
        status: false,
        message: "Vehicle already exists in user garage",
      });
    }

    // 2️⃣ Find vehicle in master collection (INDEXED)
    const matchedVehicle = await VehicleInfoData.findOne({
      vehicle_id: vehicle_number,
    }).lean();

    if (!matchedVehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found in RTO registry",
      });
    }

    const dbOwnerName = matchedVehicle.api_data?.custom_vehicle_info?.owner_name || "";

    // Flexible Name Matching Logic supporting legacy masked data
    const cleanInput = owner_name.trim().toUpperCase().replace(/\s+/g, " ");
    const cleanDb = dbOwnerName.trim().toUpperCase().replace(/\s+/g, " ");

    const maskedInput = maskName(cleanInput);
    const maskedDb = maskName(cleanDb);

    let isMatch = false;

    if (cleanInput === cleanDb) {
      isMatch = true;
    } else if (maskedInput === cleanDb) {
      isMatch = true;
    } else if (cleanInput === maskedDb) {
      isMatch = true;
    } else if (maskedInput === maskedDb) {
      isMatch = true;
    } else {
      // Character-by-character wildcard match (where * can match any character)
      if (cleanInput.length === cleanDb.length) {
        let charMatch = true;
        for (let i = 0; i < cleanInput.length; i++) {
          if (cleanInput[i] !== "*" && cleanDb[i] !== "*" && cleanInput[i] !== cleanDb[i]) {
            charMatch = false;
            break;
          }
        }
        if (charMatch) isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(404).json({
        status: false,
        message: "Vehicle owner name verification failed",
      });
    }

    // 3️⃣ Push directly (ATOMIC)
    await User.updateOne(
      { _id: user_id },
      {
        $push: {
          "garage.vehicles": {
            vehicle_id: vehicle_number,
          },
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.VEHICLE_ADDED_SUCCESSFULLY,
      data: {
        vehicle: matchedVehicle.api_data,
      },
    });
  } catch (error) {
    console.error("Add vehicle in user garage error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Transform RTO data to our vehicle schema format
 */
const transformRTODataToVehicleSchema = (rtoData, vehicleNumber) => {
  // Helper function to safely parse dates
  const parseDate = (dateInput) => {
    // If already a Date object and valid, return it
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) {
        return null;
      }
      return dateInput;
    }

    // If null or undefined, return null
    if (!dateInput) return null;

    // Convert to string for validation
    const dateString = String(dateInput).trim();

    // Check for invalid values
    if (
      dateString === "NA" ||
      dateString === "N/A" ||
      dateString === "" ||
      dateString === "null" ||
      dateString === "undefined"
    ) {
      return null;
    }

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date value: ${dateString}`);
        return null;
      }
      return date;
    } catch (error) {
      console.warn(`Failed to parse date: ${dateString}`, error);
      return null;
    }
  };

  // Helper function to safely parse year
  const parseYear = (yearString) => {
    if (!yearString) return new Date().getFullYear();
    try {
      // Handle formats like "4/2016" or "2015"
      const year = yearString.includes("/")
        ? yearString.split("/")[1]
        : yearString;
      return parseInt(year) || new Date().getFullYear();
    } catch (error) {
      console.warn(`Failed to parse year: ${yearString}`);
      return new Date().getFullYear();
    }
  };

  return {
    custom_vehicle_info: {
      owner_name:
        rtoData.registration?.owner?.name
          ?.trim()
          ?.replace(/\s+/g, " ")
          ?.toUpperCase() || "N/A",
      vehicle_number: vehicleNumber,
      vehicle_name: `${rtoData.vehicle?.manufacturer || "Unknown"} ${rtoData.vehicle?.model || "Model"
        }`,
      registration_date: parseDate(rtoData.registration?.date),
      ownership_details:
        rtoData.registration?.ownerCount === "1" ||
          rtoData.registration?.ownerCount === 1
          ? "First Owner"
          : `Owner ${rtoData.registration?.ownerCount || "Unknown"}`,
      financer_name: rtoData.finance?.isFinanced
        ? rtoData.finance.rcFinancer || ""
        : "",
      registered_rto: rtoData.registration?.authority || "N/A",
      makers_model: rtoData.vehicle?.model || "N/A",
      makers_name: rtoData.vehicle?.manufacturer || "N/A",
      vehicle_class: rtoData.vehicle?.class || "N/A",
      fuel_type: rtoData.vehicle?.fuelType || "N/A",
      fuel_norms: rtoData.vehicle?.normsType || "N/A",
      engine: rtoData.vehicle?.engine || "N/A",
      chassis_number: rtoData.vehicle?.chassis || "N/A",
      insurer_name: rtoData.insurance?.company || "N/A",
      insurance_type: "Comprehensive", // Default, can be enhanced
      insurance_expiry: parseDate(rtoData.insurance?.expiryDate),
      insurance_renewed_date: parseDate(rtoData.insurance?.expiryDate), // Same as expiry for now
      vehicle_age:
        new Date().getFullYear() -
        parseYear(rtoData.vehicle?.manufacturingYear),
      fitness_upto: parseDate(
        rtoData.vehicle?.fitnessUpTo || rtoData.registration?.expiryDate,
      ),
      pollution_renew_date: parseDate(rtoData?.pollutionControl?.validUpto),
      pollution_expiry: parseDate(rtoData?.pollutionControl?.validUpto),
      color: rtoData.vehicle?.color || "N/A",
      unloaded_weight: rtoData.vehicle?.unladenWeight?.toString() || "0",
      rc_status: rtoData.registration?.status?.active ? "Active" : "Inactive",
      insurance_policy_number: rtoData.insurance?.policyNumber || "N/A",
      category: rtoData.vehicle?.category || "N/A",
    },
    rto_data: rtoData, // Store complete RTO data for reference
    added_at: new Date(),
    last_updated: new Date(),
  };
};

/**
 * Get User's Garage - Get all vehicles in user's garage
 * GET /api/v1/garage/:user_id
 */
const getGarage = async (req, res) => {
  try {
    const { user_id } = req.params;

    // 1️⃣ Get only garage data
    const user = await User.findById(user_id).select("garage").lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const garage = user.garage || { vehicles: [] };

    if (!garage.vehicles || garage.vehicles.length === 0) {
      return res.status(200).json({
        status: true,
        message: "Garage fetched successfully",
        data: {
          vehicles: [],
          _id: garage._id || null,
        },
      });
    }

    // 2️⃣ Extract vehicle IDs
    const vehicleIds = garage.vehicles.map((v) => v.vehicle_id);

    // 3️⃣ Fetch all vehicle details in single query (🔥 optimized)
    const vehicleDetails = await VehicleInfoData.find({
      vehicle_id: { $in: vehicleIds },
    }).lean();

    // 4️⃣ Map vehicle data with garage structure
    const vehicles = garage.vehicles.map((vehicle) => {
      const apiVehicle = vehicleDetails.find(
        (v) => v.vehicle_id === vehicle.vehicle_id,
      );

      return {
        vehicle_id: vehicle.vehicle_id,
        api_data: apiVehicle?.api_data || null,
        data_source: apiVehicle?.data_source || null,
        qr_list: vehicle.qr_list || [],
        vehicle_doc: vehicle.vehicle_doc || {
          security_code: "",
          documents: [],
        },
      };
    });

    return res.status(200).json({
      status: true,
      message: "Garage fetched successfully",
      data: {
        vehicles,
        _id: garage._id,
      },
    });
  } catch (error) {
    console.error("Get garage error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/**
 * Remove Vehicle from Garage - Remove a vehicle from user's garage
 * POST /api/v1/garage/remove-vehicle
 */
const removeVehicle = async (req, res) => {
  try {
    const { user_id, vehicle_number } = req.body;

    if (!user_id || !vehicle_number) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔎 Build user query
    let userQuery = {};

    if (mongoose.Types.ObjectId.isValid(user_id)) {
      userQuery._id = user_id;
    } else if (user_id.includes("@")) {
      userQuery["basic_details.email"] = user_id.toLowerCase();
    } else {
      userQuery["basic_details.phone_number"] = String(user_id);
    }

    // ✅ Step 1: Get vehicle + qr_list
    const user = await User.findOne({
      ...userQuery,
      "garage.vehicles.vehicle_id": vehicle_number,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.VEHICLE_NOT_FOUND_IN_GARAGE,
      });
    }

    const vehicle = user.garage.vehicles.find(
      (v) => v.vehicle_id === vehicle_number,
    );

    const qrIds = vehicle?.qr_list || [];

    // ✅ Step 2: Unassign all related QR
    if (qrIds.length > 0) {
      await QRAssignment.updateMany(
        { qr_id: { $in: qrIds } },
        {
          $set: {
            qr_status: "unassigned",
            assigned_to: null,
            assigned_by: null,
            vehicle_id: null,
            assigned_at: null,
          },
        },
      );
    }

    // ✅ Step 3: Remove vehicle
    await User.updateOne(
      {
        ...userQuery,
      },
      {
        $pull: {
          "garage.vehicles": { vehicle_id: vehicle_number },
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.VEHICLE_REMOVED_FROM_GARAGE,
      data: {
        vehicle_id: vehicle_number,
        unassigned_qr: qrIds,
      },
    });
  } catch (error) {
    console.error("Remove vehicle error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

const RefreshVehicleData = async (req, res) => {
  try {
    const { vehicle_id } = req.body;
    const userId = req.user?.userId || null;

    if (!vehicle_id) {
      return res.status(400).json({
        status: false,
        message: "vehicle_id is required",
      });
    }

    let user = null;
    let refreshRemainingCredits = null;

    if (userId) {
      user = await User.findById(userId).select("account_status blocked_reason challan_credits");

      if (user && user.account_status === "BLOCKED") {
        return res.status(403).json({
          status: false,
          error_type: "blocked",
          message: "Your account has been blocked. You cannot use this service.",
          reason: user.blocked_reason || "Blocked by admin",
        });
      }

      if (user && user.account_status === "DELETED") {
        return res.status(401).json({
          status: false,
          error_type: "user_deleted",
          message: "User account is deleted.",
        });
      }

      const refreshCredits = user?.challan_credits ?? 3;
      if (refreshCredits <= 0) {
        return res.status(403).json({
          status: false,
          error_type: "no_credits",
          message: getNoCreditsMessage(),
          challan_credits: 0,
        });
      }
    }

    // 1️⃣ Get vehicle from master collection
    const vehicleDoc = await VehicleInfoData.findOne({ vehicle_id });

    if (!vehicleDoc) {
      return res.status(404).json({
        status: false,
        message: "Vehicle data not found",
      });
    }

    // 2️⃣ Fetch fresh data from RTO — LOG this refresh call
    const rtoData = await fetchVehicleDataFromRTO(vehicle_id, userId, "refresh");


    const transformedData = transformRTODataToVehicleSchema(
      rtoData,
      vehicle_id,
    );

    // 4️⃣ Update only master vehicle collection
    vehicleDoc.api_data = transformedData;
    vehicleDoc.api_data.last_updated = new Date();
    await vehicleDoc.save();

    if (userId && user) {
      const currentRefreshCredits = user.challan_credits ?? 3;
      refreshRemainingCredits = Math.max(0, currentRefreshCredits - 1);
      await User.updateOne({ _id: userId }, { $set: { challan_credits: refreshRemainingCredits } });
    }

    return res.status(200).json({
      status: true,
      message: "Vehicle data refreshed successfully",
      data: transformedData,
      challan_credits: refreshRemainingCredits,
    });
  } catch (error) {
    console.error("RefreshVehicleData Error:", error);

    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Failed to refresh vehicle data",
    });
  }
};

const checkSecurityCode = async (req, res) => {
  try {
    const { user_id, vehicle_id } = req.body;

    if (!user_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and vehicle_id are required",
      });
    }

    // 🔥 Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id",
      });
    }

    // 🔥 Only fetch required vehicle (FAST)
    const user = await User.findOne(
      {
        _id: user_id,
        "garage.vehicles.vehicle_id": vehicle_id,
      },
      {
        "garage.vehicles.$": 1,
      },
    ).lean();

    if (!user || !user.garage?.vehicles?.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this user",
      });
    }

    const vehicle = user.garage.vehicles[0];

    // 🔥 Generate secure 6 digit code
    const securityCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 🔥 Redis key
    const redisKey = `vehicleSecurity:${user_id}:${vehicle_id}`;

    // 🔥 Save in Redis (auto expire in 10 min)
    await redis.set(redisKey, securityCode, "EX", 600);

    return res.status(200).json({
      success: true,
      message: "Security code generated successfully",
      security_code: securityCode,
      expires_in: 600,
      vehicle_doc_data: vehicle.vehicle_doc?.documents || [],
    });
  } catch (error) {
    console.error("checkSecurityCode Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const verifySecurityCode = async (req, res) => {
  try {
    const { user_id, vehicle_id, security_code } = req.body;

    // ✅ Validate input
    if (!user_id || !vehicle_id || !security_code) {
      return res.status(400).json({
        success: false,
        message: "user_id, vehicle_id and security_code are required",
      });
    }

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id",
      });
    }

    // ✅ Get security code from Redis
    const redisKey = `vehicleSecurity:${user_id}:${vehicle_id}`;

    const savedCode = await redis.get(redisKey);

    if (!savedCode) {
      return res.status(400).json({
        success: false,
        message: "Security code expired or not generated",
      });
    }

    // ✅ Compare code
    if (savedCode !== security_code) {
      return res.status(401).json({
        success: false,
        message: "Invalid security code",
      });
    }

    // ✅ Fetch ONLY required vehicle documents (FAST query)
    const user = await User.findOne(
      {
        _id: user_id,
        "garage.vehicles.vehicle_id": vehicle_id,
      },
      {
        "garage.vehicles.$": 1,
      },
    ).lean();

    if (!user || !user.garage?.vehicles?.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const vehicle = user.garage.vehicles[0];

    // ✅ OPTIONAL: delete code after success (one-time use)
    await redis.del(redisKey);

    return res.status(200).json({
      success: true,
      message: "Security code verified successfully",
      data: {
        vehicle_id,
        documents: vehicle.vehicle_doc?.documents || [],
      },
    });
  } catch (error) {
    console.error("verifySecurityCode Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Get All Vehicles (garage + challan cache + vehicle details cache)
 * GET /api/v1/garage/admin/all-garages
 * Query: ?page=1&limit=20&search=UP54&tab=all|garage|challan|vehicleinfo
 */
const adminGetAllGarages = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const search = (req.query.search || "").trim().toUpperCase();
    const tab    = req.query.tab || "all"; // 'all' | 'garage' | 'challan' | 'vehicleinfo'
    const skip   = (page - 1) * limit;

    // ── 1. GARAGE vehicles ────────────────────────────────────────────────────
    const garageRows = [];
    {
      let garageMatch = { "garage.vehicles": { $exists: true, $ne: [] } };
      if (search) {
        garageMatch.$or = [
          { "garage.vehicles.vehicle_id":    { $regex: search, $options: "i" } },
          { "basic_details.phone_number":    { $regex: search, $options: "i" } },
          { "basic_details.first_name":      { $regex: search, $options: "i" } },
          { "basic_details.last_name":       { $regex: search, $options: "i" } },
        ];
      }
      const garageUsers = await User.find(garageMatch)
        .select("_id basic_details.first_name basic_details.last_name basic_details.phone_number basic_details.email basic_details.profile_pic garage.vehicles.vehicle_id account_status updatedAt")
        .lean();

      for (const user of garageUsers) {
        const name = `${user.basic_details?.first_name || ""} ${user.basic_details?.last_name || ""}`.trim() || "N/A";
        for (const v of (user.garage?.vehicles || [])) {
          if (search &&
            !v.vehicle_id.includes(search) &&
            !name.toUpperCase().includes(search) &&
            !(user.basic_details?.phone_number || "").includes(search)) continue;
          garageRows.push({
            source:        "garage",
            vehicle_id:    v.vehicle_id,
            userId:        user._id,
            userName:      name,
            userPhone:     user.basic_details?.phone_number || "N/A",
            userEmail:     user.basic_details?.email || "",
            profilePic:    user.basic_details?.profile_pic || "",
            accountStatus: user.account_status,
            sortTime:      user.updatedAt || new Date(0),
          });
        }
      }
    }

    // Garage vehicle_ids set — to skip duplication in other tabs
    const garageVehicleSet = new Set(garageRows.map(r => String(r.vehicle_id)));

    // ── 2. CHALLAN DATA — RTOChallanCache ────────────────────────────────────
    const challanRows = [];
    {
      const cacheQuery = search ? { rcNumber: { $regex: search, $options: "i" } } : {};
      const allCache   = await RTOChallanCache.find(cacheQuery)
        .select("rcNumber updatedAt")
        .sort({ updatedAt: -1 })
        .lean();

      // Get most recent user who searched each vehicle (from RTOApiLog)
      const cachedRcNumbers = allCache.map(c => c.rcNumber).filter(Boolean);
      const recentLogs = await RTOApiLog.aggregate([
        { $match: { vehicleNumber: { $in: cachedRcNumbers } } },
        { $group: { _id: "$vehicleNumber", userId: { $last: "$userId" }, lastSeen: { $max: "$createdAt" } } },
      ]);
      const logMap = {};
      for (const l of recentLogs) if (l._id) logMap[String(l._id)] = l;

      // Fetch user details for all userIds from logs
      const logUserIds = [...new Set(recentLogs.map(l => l.userId).filter(Boolean))];
      const logUsers   = await User.find({ _id: { $in: logUserIds } })
        .select("_id basic_details.first_name basic_details.last_name basic_details.phone_number basic_details.email account_status")
        .lean();
      const userMap = {};
      for (const u of logUsers) userMap[String(u._id)] = u;

      for (const cache of allCache) {
        const vid = String(cache.rcNumber);
        if (!vid) continue;
        if (garageVehicleSet.has(vid)) continue; // already shown in garage tab

        const log    = logMap[vid];
        const user   = log?.userId ? (userMap[String(log.userId)] || null) : null;

        // Skip if no phone number (guest/anonymous)
        if (!user?.basic_details?.phone_number) continue;

        const userName = `${user.basic_details?.first_name || ""} ${user.basic_details?.last_name || ""}`.trim() || "N/A";

        challanRows.push({
          source:        "challan",
          vehicle_id:    cache.rcNumber,
          userId:        log?.userId || null,
          userName,
          userPhone:     user.basic_details?.phone_number || "-",
          userEmail:     user.basic_details?.email || "-",
          profilePic:    "",
          accountStatus: user.account_status || "ACTIVE",
          lastChecked:   log?.lastSeen || cache.updatedAt || null,
          sortTime:      log?.lastSeen || cache.updatedAt || new Date(0),
        });
      }
    }

    // Challan+Garage vehicle_ids set — to skip duplication in vehicleInfo tab
    const existingVehicleSet = new Set([
      ...garageVehicleSet,
      ...challanRows.map(r => String(r.vehicle_id)),
    ]);

    // ── 3. VEHICLE DETAILS DATA — VehicleInfoData ─────────────────────────────
    const vehicleInfoRows = [];
    {
      const viQuery = search ? { vehicle_id: { $regex: search, $options: "i" } } : {};
      const allVI   = await VehicleInfoData.find(viQuery)
        .select("vehicle_id data_source updatedAt")
        .sort({ updatedAt: -1 })
        .lean();

      const viVehicleIds = allVI.map(v => v.vehicle_id).filter(Boolean);

      // Get most recent user who fetched each vehicle (from RTOApiLog)
      const viLogs = await RTOApiLog.aggregate([
        { $match: { vehicleNumber: { $in: viVehicleIds }, trigger: { $in: ["add_vehicle", "refresh"] } } },
        { $group: { _id: "$vehicleNumber", userId: { $last: "$userId" }, lastSeen: { $max: "$createdAt" } } },
      ]);
      const viLogMap = {};
      for (const l of viLogs) if (l._id) viLogMap[String(l._id)] = l;

      const viUserIds = [...new Set(viLogs.map(l => l.userId).filter(Boolean))];
      const viUsers   = await User.find({ _id: { $in: viUserIds } })
        .select("_id basic_details.first_name basic_details.last_name basic_details.phone_number basic_details.email account_status")
        .lean();
      const viUserMap = {};
      for (const u of viUsers) viUserMap[String(u._id)] = u;

      for (const vi of allVI) {
        const vid = String(vi.vehicle_id);
        if (!vid) continue;
        if (existingVehicleSet.has(vid)) continue; // skip if already shown

        const log    = viLogMap[vid];
        const user   = log?.userId ? (viUserMap[String(log.userId)] || null) : null;

        const userName = user
          ? `${user.basic_details?.first_name || ""} ${user.basic_details?.last_name || ""}`.trim() || "N/A"
          : "System";

        vehicleInfoRows.push({
          source:        "vehicleinfo",
          vehicle_id:    vi.vehicle_id,
          userId:        log?.userId || null,
          userName,
          userPhone:     user?.basic_details?.phone_number || "-",
          userEmail:     user?.basic_details?.email || "-",
          profilePic:    "",
          accountStatus: user?.account_status || "ACTIVE",
          dataSource:    vi.data_source || "rto_api",
          lastChecked:   log?.lastSeen || vi.updatedAt || null,
          sortTime:      log?.lastSeen || vi.updatedAt || new Date(0),
        });
      }
    }

    // ── 4. Apply tab filter + paginate ────────────────────────────────────────
    let displayRows;
    if      (tab === "garage")      displayRows = garageRows;
    else if (tab === "challan")     displayRows = challanRows;
    else if (tab === "vehicleinfo") displayRows = vehicleInfoRows;
    else                            displayRows = [...garageRows, ...challanRows]; // Exclude vehicleInfoRows from "All"

    // Sort newest first
    displayRows.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));

    const total     = displayRows.length;
    const paginated = displayRows.slice(skip, skip + limit);

    return res.status(200).json({
      status: true,
      message: "Vehicles fetched successfully",
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages:       Math.ceil(total / limit) || 1,
        garageCount:      garageRows.length,
        challanCount:     challanRows.length,
        vehicleInfoCount: vehicleInfoRows.length,
        allCount:         garageRows.length + challanRows.length, // Exclude vehicleInfoRows count
      },
    });
  } catch (error) {
    console.error("adminGetAllGarages error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin: Autocomplete vehicle number suggestions
 * GET /api/v1/garage/admin/autocomplete?q=UP54
 */
const adminVehicleAutocomplete = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toUpperCase();
    if (q.length < 2) return res.status(200).json({ status: true, suggestions: [] });

    // Search garage vehicles
    const garageUsers = await User.find(
      { "garage.vehicles.vehicle_id": { $regex: q, $options: "i" } },
      { "garage.vehicles.vehicle_id": 1 }
    ).limit(20).lean();

    const garageNumbers = new Set();
    for (const u of garageUsers) {
      for (const v of (u.garage?.vehicles || [])) {
        if (v.vehicle_id.includes(q)) garageNumbers.add(v.vehicle_id);
      }
    }

    // Search RTO logs
    const rtoLogs = await RTOApiLog.find(
      { vehicleNumber: { $regex: q, $options: "i" } },
      { vehicleNumber: 1 }
    ).limit(30).lean();

    const allNumbers = new Set([...garageNumbers, ...rtoLogs.map(l => l.vehicleNumber)]);

    const suggestions = [...allNumbers]
      .filter(Boolean)
      .sort()
      .slice(0, 10);

    return res.status(200).json({ status: true, suggestions });
  } catch (error) {
    console.error("adminVehicleAutocomplete error:", error);
    return res.status(500).json({ status: false, suggestions: [] });
  }
};

/**
 * Admin: Delete a vehicle from any user's garage
 * DELETE /api/v1/garage/admin/delete-vehicle
 */
const adminDeleteVehicleFromGarage = async (req, res) => {
  try {
    const { user_id, vehicle_number } = req.body;

    if (!user_id || !vehicle_number) {
      return res.status(400).json({
        status: false,
        message: "user_id and vehicle_number are required",
      });
    }

    const user = await User.findOne({
      _id: user_id,
      "garage.vehicles.vehicle_id": vehicle_number,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found in user's garage",
      });
    }

    const vehicle = user.garage.vehicles.find((v) => v.vehicle_id === vehicle_number);
    const qrIds = vehicle?.qr_list || [];

    // Unassign all related QR codes
    if (qrIds.length > 0) {
      await QRAssignment.updateMany(
        { qr_id: { $in: qrIds } },
        {
          $set: {
            qr_status: "unassigned",
            assigned_to: null,
            assigned_by: null,
            vehicle_id: null,
            assigned_at: null,
          },
        },
      );
    }

    // Remove the vehicle from garage
    await User.updateOne(
      { _id: user_id },
      { $pull: { "garage.vehicles": { vehicle_id: vehicle_number } } },
    );

    return res.status(200).json({
      status: true,
      message: `Vehicle ${vehicle_number} removed from garage successfully`,
      data: { vehicle_id: vehicle_number, unassigned_qr: qrIds },
    });
  } catch (error) {
    console.error("adminDeleteVehicleFromGarage error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Full-wipe delete for a vehicle — clears ALL cached data
 * so the next search always hits the 3rd party API fresh.
 * DELETE /api/v1/garage/admin/delete-challan-record
 * Body: { vehicle_number, user_id? }
 */
const adminDeleteChallanRecord = async (req, res) => {
  try {
    const { vehicle_number, user_id } = req.body;

    if (!vehicle_number) {
      return res.status(400).json({ status: false, message: "vehicle_number is required" });
    }

    const cleanVehicleNumber = vehicle_number.toUpperCase().trim();

    // Build filters
    const rtoLogFilter    = { vehicleNumber: cleanVehicleNumber };
    const webhookFilter   = { rcNumber:      cleanVehicleNumber };
    const cacheFilter     = { rcNumber:      cleanVehicleNumber };
    const vehicleInfoFilter = { vehicle_id:  cleanVehicleNumber };

    // If user_id provided, scope RTOApiLog and ChallanWebhook to that user
    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      rtoLogFilter.userId  = user_id;
      webhookFilter.userId = user_id;
    }

    // Wipe all 4 collections in parallel
    const [rtoResult, webhookResult, cacheResult, viResult] = await Promise.all([
      RTOApiLog.deleteMany(rtoLogFilter),
      ChallanWebhook.deleteMany(webhookFilter),
      RTOChallanCache.deleteMany(cacheFilter),
      VehicleInfoData.deleteMany(vehicleInfoFilter),
    ]);

    const totalDeleted =
      rtoResult.deletedCount +
      webhookResult.deletedCount +
      cacheResult.deletedCount +
      viResult.deletedCount;

    if (totalDeleted === 0) {
      return res.status(404).json({
        status: false,
        message: "No records found for this vehicle number",
      });
    }

    return res.status(200).json({
      status: true,
      message: `All cached data for ${cleanVehicleNumber} deleted. Next search will hit the 3rd party API fresh.`,
      data: {
        vehicle_number: cleanVehicleNumber,
        deleted: {
          rtoApiLogs:       rtoResult.deletedCount,
          challanWebhooks:  webhookResult.deletedCount,
          challanCache:     cacheResult.deletedCount,
          vehicleInfoData:  viResult.deletedCount,
        },
      },
    });
  } catch (error) {
    console.error("adminDeleteChallanRecord error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

module.exports = {
  addVehicle,
  addVehicleInUsergarage,
  RefreshVehicleData,
  getGarage,
  removeVehicle,
  checkSecurityCode,
  verifySecurityCode,
  adminGetAllGarages,
  adminDeleteVehicleFromGarage,
  adminVehicleAutocomplete,
  adminDeleteChallanRecord,
};
