const mongoose = require("mongoose");
const User = require("../models/User");
const VehicleInfoData = require("../models/vehicleInfoSchema");
const axios = require("axios");
const redis = require("../utils/redis");
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require("../../constants");
const {
  maskName,
  maskVehicleNumber,
  maskAlphaNumeric,
} = require("../utils/maskData");

/**
 * Add Vehicle to Garage - Fetch vehicle data from RTO and save to user's garage
 * POST /api/v1/garage/add-vehicle
 */
const addVehicle = async (req, res) => {
  try {
    const { vehicle_number } = req.body;
    if (!vehicle_number) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // 🔥 FAST indexed lookup
    const cachedVehicle = await VehicleInfoData.findOne({
      vehicle_id: vehicle_number,
    }).lean();

    if (cachedVehicle) {
      return res.status(200).json({
        status: true,
        message: SUCCESS_MESSAGES.GARAGE_RETRIEVED_SUCCESSFULLY,
        data: {
          result: maskVehicleResponse(cachedVehicle.api_data),
          data_source: cachedVehicle.data_source,
        },
      });
    }

    // ⛔ External API only if not cached
    let rtoData;
    let dataSource = "rto_api";

    try {
      rtoData = await fetchVehicleDataFromRTO(vehicle_number);
    } catch (error) {
      if (error.statusCode === 500) {
        rtoData = await fetchVehicleDataFromRTOPremimumApi(vehicle_number);
        dataSource = "rto_premium_api";
      } else {
        throw error;
      }
    }

    const vehicleData = transformRTODataToVehicleSchema(
      rtoData,
      vehicle_number,
    );

    // 🔥 Single insert, no array push
    await VehicleInfoData.create({
      vehicle_id: vehicle_number,
      api_data: vehicleData,
      data_source: dataSource,
    });

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.GARAGE_RETRIEVED_SUCCESSFULLY,
      data: {
        result: maskVehicleResponse(vehicleData),
        data_source: dataSource,
      },
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
 * Fetch vehicle data from RTO API
 * Makes actual API call to RTO service
 */
const fetchVehicleDataFromRTO = async (vehicleNumber) => {
  console.log("➡️ Calling NORMAL RTO API");

  try {
    const response = await axios.post(
      process.env.RTO_API_URL,
      { rcNumber: vehicleNumber },
      {
        headers: {
          accessToken: process.env.RTO_API_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    if (response.status === 200 && response.data.code === 200) {
      return response.data.result;
    }

    // logical not found
    const err = new Error("NORMAL_RTO_FAILED");
    err.statusCode = 500;
    throw err;
  } catch (error) {
    const err = new Error("NORMAL_RTO_FAILED");
    err.statusCode = 500;
    throw err;
  }
};

const fetchVehicleDataFromRTOPremimumApi = async (vehicleNumber) => {
  console.log("➡️ Calling PREMIUM RTO API");

  try {
    const response = await axios.post(
      process.env.RTO_PREMIMUM_API_URL,
      { rcNumber: vehicleNumber },
      {
        headers: {
          accessToken: process.env.RTO_API_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    if (response.status === 200 && response.data.statusCode === 200) {
      return response.data.result;
    }

    const err = new Error(response.data.message || "Premium RTO API failed");
    err.statusCode = response.data.statusCode || 500;
    throw err;
  } catch (error) {
    // ✅ If external API returned response
    if (error.response) {
      const err = new Error(
        error.response.data?.message ||
          error.response.statusText ||
          "Premium RTO API error",
      );
      err.statusCode = error.response.status;
      throw err;
    }

    // ✅ Network / timeout issue
    if (error.code === "ECONNABORTED") {
      const err = new Error("Premium RTO API timeout");
      err.statusCode = 504;
      throw err;
    }

    // ✅ Any unknown error
    const err = new Error(error.message || "Premium RTO unavailable");
    err.statusCode = 502;
    throw err;
  }
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
      "api_data.custom_vehicle_info.owner_name": {
        $regex: new RegExp(`^${owner_name}$`, "i"),
      },
    }).lean();

    if (!matchedVehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or owner name mismatch",
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
        vehicle: maskVehicleResponse(matchedVehicle.api_data),
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
      vehicle_name: `${rtoData.vehicle?.manufacturer || "Unknown"} ${
        rtoData.vehicle?.model || "Model"
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

    // 🔥 Build user query dynamically
    let userQuery = {};

    if (mongoose.Types.ObjectId.isValid(user_id)) {
      userQuery._id = user_id;
    } else if (user_id.includes("@")) {
      userQuery["basic_details.email"] = user_id.toLowerCase();
    } else {
      userQuery["basic_details.phone_number"] = String(user_id);
    }

    // 🔥 Atomic pull (NO full user fetch)
    const result = await User.updateOne(
      {
        ...userQuery,
        "garage.vehicles.vehicle_id": vehicle_number, // ensure exists
      },
      {
        $pull: {
          "garage.vehicles": { vehicle_id: vehicle_number },
        },
      },
    );

    // 🚫 Nothing removed
    if (result.modifiedCount === 0) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.VEHICLE_NOT_FOUND_IN_GARAGE,
      });
    }

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.VEHICLE_REMOVED_FROM_GARAGE,
      data: {
        vehicle_id: vehicle_number,
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

    if (!vehicle_id) {
      return res.status(400).json({
        status: false,
        message: "vehicle_id is required",
      });
    }

    // 1️⃣ Get vehicle from master collection
    const vehicleDoc = await VehicleInfoData.findOne({ vehicle_id });

    if (!vehicleDoc) {
      return res.status(404).json({
        status: false,
        message: "Vehicle data not found",
      });
    }

    const lastUpdated = new Date(vehicleDoc.api_data?.last_updated);
    const now = new Date();
    const diffInHours = (now - lastUpdated) / (1000 * 60 * 60);

    // 2️⃣ If data is already fresh (<24h)
    if (diffInHours < 24) {
      return res.status(200).json({
        status: true,
        message: "Vehicle data already up to date",
        data: vehicleDoc.api_data,
      });
    }

    // 3️⃣ Fetch fresh data from RTO
    const rtoData = await fetchVehicleDataFromRTO(vehicle_id);

    const transformedData = transformRTODataToVehicleSchema(
      rtoData,
      vehicle_id,
    );

    // 4️⃣ Update only master vehicle collection
    vehicleDoc.api_data = transformedData;
    vehicleDoc.api_data.last_updated = new Date();
    await vehicleDoc.save();

    return res.status(200).json({
      status: true,
      message: "Vehicle data refreshed successfully",
      data: transformedData,
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
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

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

module.exports = {
  addVehicle,
  addVehicleInUsergarage,
  RefreshVehicleData,
  getGarage,
  removeVehicle,
  checkSecurityCode,
  verifySecurityCode,
};
