const mongoose = require("mongoose");
const User = require("../models/User");
const VehicleInfoData = require("../models/vehicleInfoSchema");
const axios = require("axios");
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

    let vehicleInfoDoc = await VehicleInfoData.findOne();

    if (!vehicleInfoDoc) {
      vehicleInfoDoc = new VehicleInfoData({ vehicles: [] });
    }

    const cachedVehicle = vehicleInfoDoc.vehicles.find(
      (v) => v.vehicle_id === vehicle_number
    );

    // ✅ CASE 1: CACHE HIT
    if (cachedVehicle) {
      return res.status(200).json({
        status: true,
        message: SUCCESS_MESSAGES.GARAGE_RETRIEVED_SUCCESSFULLY,
        data: {
          result: maskVehicleResponse(cachedVehicle.api_data),
          data_source: "vehicle_info_cache",
        },
      });
    }

    // ❌ CASE 2: FETCH FROM RTO
    let rtoData;
    try {
      rtoData = await fetchVehicleDataFromRTO(vehicle_number);
    } catch (err) {
      return res.status(404).json({
        status: false,
        message: err.message || ERROR_MESSAGES.RTO_API_FAILED,
      });
    }

    const vehicleData = transformRTODataToVehicleSchema(
      rtoData,
      vehicle_number
    );

    vehicleInfoDoc.vehicles.push({
      vehicle_id: vehicle_number,
      api_data: vehicleData,
    });

    await vehicleInfoDoc.save();

    return res.status(200).json({
      status: true,
      message: SUCCESS_MESSAGES.GARAGE_RETRIEVED_SUCCESSFULLY,
      data: {
        result: maskVehicleResponse(vehicleData),
        data_source: "rto_api",
      },
    });
  } catch (error) {
    console.error("Add vehicle error:", error);
    return res.status(500).json({
      status: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

const maskVehicleResponse = (data) => {
  if (!data) return data;

  return {
    ...data,

    custom_vehicle_info: {
      ...data.custom_vehicle_info,
      owner_name: maskName(data.custom_vehicle_info.owner_name),
      vehicle_number: maskVehicleNumber(
        data.custom_vehicle_info.vehicle_number
      ),
      engine: maskAlphaNumeric(data.custom_vehicle_info.engine),
      chassis_number: maskAlphaNumeric(data.custom_vehicle_info.chassis_number),
      insurance_policy_number: maskAlphaNumeric(
        data.custom_vehicle_info.insurance_policy_number
      ),
    },

    rto_data: {
      ...data.rto_data,

      registration: {
        ...data.rto_data.registration,
        number: maskVehicleNumber(data.rto_data.registration.number),
        owner: {
          ...data.rto_data.registration.owner,
          name: maskName(data.rto_data.registration.owner.name),
          fatherName: maskName(data.rto_data.registration.owner.fatherName),
          presentAddress: "******",
          permanentAddress: "******",
        },
      },

      vehicle: {
        ...data.rto_data.vehicle,
        engine: maskAlphaNumeric(data.rto_data.vehicle.engine),
        chassis: maskAlphaNumeric(data.rto_data.vehicle.chassis),
      },

      insurance: {
        ...data.rto_data.insurance,
        policyNumber: maskAlphaNumeric(data.rto_data.insurance.policyNumber),
      },

      pollutionControl: {
        ...data.rto_data.pollutionControl,
        certificateNumber: maskAlphaNumeric(
          data.rto_data.pollutionControl.certificateNumber
        ),
      },
    },
  };
};

const addVehicleInUsergarage = async (req, res) => {
  try {
    const { user_id, vehicle_number, owner_name } = req.body;

    // ------------------ VALIDATION ------------------
    if (!vehicle_number || !owner_name) {
      return res.status(400).json({
        status: false,
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    // ------------------ FIND USER ------------------
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    if (!user.garage) {
      user.garage = { security_code: "", vehicles: [] };
    }

    // ------------------ DUPLICATE CHECK IN USER GARAGE ------------------
    const alreadyExists = user.garage.vehicles.find(
      (v) => v.vehicle_id === vehicle_number
    );

    if (alreadyExists) {
      return res.status(400).json({
        status: false,
        message: "Vehicle already exists in user garage",
      });
    }

    // ------------------ FIND IN VehicleInfoData ------------------
    const vehicleInfoDoc = await VehicleInfoData.findOne();

    if (!vehicleInfoDoc) {
      return res.status(404).json({
        status: false,
        message: "Vehicle data not found in system",
      });
    }

    const matchedVehicle = vehicleInfoDoc.vehicles.find(
      (v) =>
        v.vehicle_id === vehicle_number &&
        v.api_data?.custom_vehicle_info?.owner_name?.toLowerCase().trim() ===
          owner_name.toLowerCase().trim()
    );

    console.log(matchedVehicle);

    if (!matchedVehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or owner name does not match our records",
      });
    }

    // ------------------ SAVE IN USER GARAGE ------------------
    user.garage.vehicles.push({
      vehicle_id: vehicle_number,
      api_data: matchedVehicle.api_data,
    });

    await user.save();

    // ------------------ RESPONSE ------------------
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
 * Fetch vehicle data from RTO API
 * Makes actual API call to RTO service
 */
const fetchVehicleDataFromRTO = async (vehicleNumber) => {
  try {
    // Get environment variables
    const rtoApiUrl = process.env.RTO_API_URL;
    const rtoAccessToken = process.env.RTO_API_ACCESS_TOKEN;

    // Validate environment variables
    if (!rtoApiUrl || !rtoAccessToken) {
      throw new Error(
        "RTO API configuration missing. Please check RTO_API_URL and RTO_API_ACCESS_TOKEN environment variables."
      );
    }

    // Make API call to RTO service
    const response = await axios.post(
      rtoApiUrl,
      {
        rcNumber: vehicleNumber,
      },
      {
        headers: {
          accessToken: rtoAccessToken,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    // Check if API call was successful
    if (response.status === 200 && response.data.code === 200) {
      return response.data.result;
    } else if (response.data.code === 404) {
      throw new Error("Vehicle data not found");
    } else {
      throw new Error(
        `RTO API returned error: ${response.data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("RTO API fetch error:", error);

    // Handle specific error cases
    if (error.response) {
      // API responded with error status
      const statusCode = error.response.status;
      const errorData = error.response.data;

      if (statusCode === 404 || errorData?.code === 404) {
        throw new Error("Vehicle data not found");
      } else if (statusCode === 401) {
        throw new Error("Invalid RTO API access token");
      } else if (statusCode === 429) {
        throw new Error("RTO API rate limit exceeded");
      } else {
        throw new Error(
          `RTO API error: ${errorData?.message || error.message}`
        );
      }
    } else if (error.request) {
      // Network error
      throw new Error("Unable to connect to RTO API service");
    } else {
      // Other errors
      throw new Error(
        `Failed to fetch vehicle data from RTO: ${error.message}`
      );
    }
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
      owner_name: rtoData.registration?.owner?.name || "N/A",
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
        rtoData.vehicle?.fitnessUpTo || rtoData.registration?.expiryDate
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

    const user = await User.findById(user_id).select("garage");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Garage fetched successfully",
      data: user.garage || { security_code: "", vehicles: [] },
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
    // NOTE: vehicle_number here is actually vehicle_id

    if (!user_id || !vehicle_number) {
      return res.status(400).json({
        status: false,
        error_type: "Invalid parameter",
        message: ERROR_MESSAGES.INVALID_PARAMETER,
      });
    }

    let user;

    // CASE 1: user_id is Mongo ObjectId
    if (mongoose.Types.ObjectId.isValid(user_id)) {
      user = await User.findById(user_id);
    }

    // CASE 2: user_id is email
    else if (user_id.includes("@")) {
      user = await User.findOne({
        "basic_details.email": user_id.toLowerCase(),
      });
    }

    // CASE 3: user_id is phone number
    else {
      user = await User.findOne({
        "basic_details.phone_number": String(user_id),
      });
    }

    if (!user) {
      return res.status(404).json({
        status: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    // Check if user has vehicles
    if (
      !user.garage ||
      !user.garage.vehicles ||
      user.garage.vehicles.length === 0
    ) {
      return res.status(404).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.VEHICLE_NOT_FOUND_IN_GARAGE,
      });
    }

    console.log("Vehicles:", user.garage.vehicles);

    // Find vehicle by actual location of vehicle_id (inside api_data)
    const vehicleIndex = user.garage.vehicles.findIndex(
      (vehicle) => vehicle.vehicle_id === vehicle_number
    );

    console.log("Found index:", vehicleIndex);

    if (vehicleIndex === -1) {
      return res.status(404).json({
        status: false,
        error_type: "other",
        message: ERROR_MESSAGES.VEHICLE_NOT_FOUND_IN_GARAGE,
      });
    }

    // Remove vehicle
    user.garage.vehicles.splice(vehicleIndex, 1);
    await user.save();

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
      error_type: "other",
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

module.exports = {
  addVehicle,
  addVehicleInUsergarage,
  getGarage,
  removeVehicle,
};
