const VehicleForAdd = require("../models/VehicleForAdd");
const RTOApiLog = require("../models/RTOApiLog");
const User = require("../models/User");
const VehicleInfoData = require("../models/vehicleInfoSchema");
const mongoose = require("mongoose");

/**
 * Admin: Get all "Vehicle For Add" records (3rd party API had no data)
 * GET /api/v1/vehicle-for-add/admin/list
 * Query: ?page=1&limit=50&filter=all|pending|downloaded&search=JK02&apiType=VEHICLE|CHALLAN
 */
const adminGetVehiclesForAdd = async (req, res) => {
  try {
    const page     = parseInt(req.query.page)  || 1;
    const limit    = parseInt(req.query.limit) || 50;
    const filter   = req.query.filter  || "all"; // all | pending | downloaded
    const search   = (req.query.search || "").trim().toUpperCase();
    const apiType  = req.query.apiType  || "ALL"; // ALL | VEHICLE | CHALLAN
    let fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    let toDate   = req.query.toDate   ? new Date(req.query.toDate)   : null;

    if (!req.query.fromDate && !req.query.toDate) {
      fromDate = new Date("2026-08-07T00:00:00.000+05:30");
    }

    const skip     = (page - 1) * limit;

    const query = {};
    if (filter === "pending")    query.isDownloaded = false;
    if (filter === "downloaded") query.isDownloaded = true;
    if (apiType === "VEHICLE")   query.failedApis = "VEHICLE";
    if (apiType === "CHALLAN")   query.failedApis = "CHALLAN";
    if (search)                  query.vehicleNumber = { $regex: search, $options: "i" };
    if (fromDate || toDate) {
      query.lastFailedAt = {};
      if (fromDate) { fromDate.setHours(0, 0, 0, 0);   query.lastFailedAt.$gte = fromDate; }
      if (toDate)   { toDate.setHours(23, 59, 59, 999); query.lastFailedAt.$lte = toDate;   }
    }

    const [total, records] = await Promise.all([
      VehicleForAdd.countDocuments(query),
      VehicleForAdd.find(query)
        .sort({ isDownloaded: 1, lastFailedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userIds", "basic_details.first_name basic_details.last_name basic_details.phone_number public_details.nick_name")
        .lean(),
    ]);

    // Base count query WITHOUT date filter (for tab counts)
    const baseCountQuery = {};
    if (apiType === "VEHICLE") baseCountQuery.failedApis = "VEHICLE";
    if (apiType === "CHALLAN") baseCountQuery.failedApis = "CHALLAN";

    // Date-aware base for pending/downloaded/all sub-counts
    const dateBase = { ...baseCountQuery };
    if (fromDate || toDate) {
      dateBase.lastFailedAt = {};
      if (fromDate) dateBase.lastFailedAt.$gte = fromDate;
      if (toDate)   dateBase.lastFailedAt.$lte = toDate;
    }

    return res.status(200).json({
      status: true,
      message: "Vehicles fetched successfully",
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages:      Math.ceil(total / limit) || 1,
        allCount:        await VehicleForAdd.countDocuments(dateBase),
        pendingCount:    await VehicleForAdd.countDocuments({ ...dateBase, isDownloaded: false }),
        downloadedCount: await VehicleForAdd.countDocuments({ ...dateBase, isDownloaded: true }),
        vehicleCount:    await VehicleForAdd.countDocuments({ ...dateBase, failedApis: "VEHICLE" }),
        challanCount:    await VehicleForAdd.countDocuments({ ...dateBase, failedApis: "CHALLAN" }),
      },
    });
  } catch (error) {
    console.error("adminGetVehiclesForAdd error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin: Get successful API vehicle records (RTOApiLog success=true)
 * GET /api/v1/vehicle-for-add/admin/success-list
 * Query: ?page=1&limit=50&filter=all|pending|downloaded&search=JK02&apiType=VEHICLE|CHALLAN
 *
 * apiType=VEHICLE  => rto_api, rto_premium_api logs
 * apiType=CHALLAN  => challan_plus_api logs
 *
 * NOTE: success vehicles don't have downloaded status — filter for them is just all/vehicle/challan
 */
const adminGetSuccessVehicles = async (req, res) => {
  try {
    const page     = parseInt(req.query.page)  || 1;
    const limit    = parseInt(req.query.limit) || 50;
    const search   = (req.query.search || "").trim().toUpperCase();
    const apiType  = req.query.apiType  || "ALL"; // ALL | VEHICLE | CHALLAN
    let fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    let toDate   = req.query.toDate   ? new Date(req.query.toDate)   : null;

    if (!req.query.fromDate && !req.query.toDate) {
      fromDate = new Date("2026-08-07T00:00:00.000+05:30");
    }

    const skip     = (page - 1) * limit;

    const query = { success: true };
    if (apiType === "VEHICLE") query.apiType = { $in: ["rto_api", "rto_premium_api"] };
    if (apiType === "CHALLAN") query.apiType = "challan_plus_api";
    if (search) query.vehicleNumber = { $regex: search, $options: "i" };
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) { fromDate.setHours(0, 0, 0, 0);   query.createdAt.$gte = fromDate; }
      if (toDate)   { toDate.setHours(23, 59, 59, 999); query.createdAt.$lte = toDate;   }
    }

    // Aggregate to get unique vehicle numbers with latest call info
    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: "$vehicleNumber",
          vehicleNumber: { $first: "$vehicleNumber" },
          apiTypes: { $addToSet: "$apiType" },
          callCount: { $sum: 1 },
          lastSuccessAt: { $max: "$createdAt" },
          userId: { $first: "$userId" },
        }
      },
      { $sort: { lastSuccessAt: -1 } },
    ];

    // Count distinct vehicles matching query
    const countPipeline = [
      { $match: query },
      { $group: { _id: "$vehicleNumber" } },
      { $count: "total" },
    ];

    const [countResult, records] = await Promise.all([
      RTOApiLog.aggregate(countPipeline),
      RTOApiLog.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit },
      ]),
    ]);

    const total = countResult[0]?.total || 0;

    // Count for tabs: vehicle and challan type unique vehicles
    const baseMatch = { success: true };
    if (fromDate || toDate) {
      baseMatch.createdAt = {};
      if (fromDate) baseMatch.createdAt.$gte = fromDate;
      if (toDate) baseMatch.createdAt.$lte = toDate;
    }

    const vehicleCountPipeline = [
      { $match: { ...baseMatch, apiType: { $in: ["rto_api", "rto_premium_api"] } } },
      { $group: { _id: "$vehicleNumber" } },
      { $count: "total" },
    ];
    const challanCountPipeline = [
      { $match: { ...baseMatch, apiType: "challan_plus_api" } },
      { $group: { _id: "$vehicleNumber" } },
      { $count: "total" },
    ];
    const allCountPipeline = [
      { $match: baseMatch },
      { $group: { _id: "$vehicleNumber" } },
      { $count: "total" },
    ];

    const [vehicleCountRes, challanCountRes, allCountRes] = await Promise.all([
      RTOApiLog.aggregate(vehicleCountPipeline),
      RTOApiLog.aggregate(challanCountPipeline),
      RTOApiLog.aggregate(allCountPipeline),
    ]);

    return res.status(200).json({
      status: true,
      message: "Success vehicles fetched",
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages:   Math.ceil(total / limit) || 1,
        allCount:     allCountRes[0]?.total || 0,
        vehicleCount: vehicleCountRes[0]?.total || 0,
        challanCount: challanCountRes[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("adminGetSuccessVehicles error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin: Get API stats for pie chart (fail vs success counts)
 * GET /api/v1/vehicle-for-add/admin/stats
 */
const adminGetApiStats = async (req, res) => {
  try {
    let fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    let toDate   = req.query.toDate   ? new Date(req.query.toDate)   : null;

    if (!req.query.fromDate && !req.query.toDate) {
      fromDate = new Date("2026-08-07T00:00:00.000+05:30");
    }


    const failQuery = {};
    const successQuery = { success: true };

    if (fromDate || toDate) {
      const fDateQuery = {};
      const sDateQuery = {};
      
      if (fromDate) { 
        const fDate = new Date(fromDate); fDate.setHours(0, 0, 0, 0); 
        fDateQuery.$gte = fDate; 
        sDateQuery.$gte = fDate; 
      }
      if (toDate) { 
        const tDate = new Date(toDate); tDate.setHours(23, 59, 59, 999); 
        fDateQuery.$lte = tDate; 
        sDateQuery.$lte = tDate; 
      }
      
      failQuery.lastFailedAt = fDateQuery;
      successQuery.createdAt = sDateQuery;
    }

    const [
      totalFail,
      totalSuccess,
      vehicleFail,
      vehicleSuccess,
      challanFail,
      challanSuccess,
    ] = await Promise.all([
      VehicleForAdd.countDocuments(failQuery),
      RTOApiLog.aggregate([{ $match: successQuery }, { $group: { _id: "$vehicleNumber" } }, { $count: "total" }]),
      VehicleForAdd.countDocuments({ ...failQuery, failedApis: "VEHICLE" }),
      RTOApiLog.aggregate([{ $match: { ...successQuery, apiType: { $in: ["rto_api", "rto_premium_api"] } } }, { $group: { _id: "$vehicleNumber" } }, { $count: "total" }]),
      VehicleForAdd.countDocuments({ ...failQuery, failedApis: "CHALLAN" }),
      RTOApiLog.aggregate([{ $match: { ...successQuery, apiType: "challan_plus_api" } }, { $group: { _id: "$vehicleNumber" } }, { $count: "total" }]),
    ]);

    const successTotal = totalSuccess[0]?.total || 0;
    const vehicleSuccessTotal = vehicleSuccess[0]?.total || 0;
    const challanSuccessTotal = challanSuccess[0]?.total || 0;

    const grandTotal = totalFail + successTotal;
    const vehicleTotal = vehicleFail + vehicleSuccessTotal;
    const challanTotal = challanFail + challanSuccessTotal;

    return res.status(200).json({
      status: true,
      data: {
        overall: {
          fail: totalFail,
          success: successTotal,
          total: grandTotal,
          failPct:    grandTotal > 0 ? Math.round((totalFail / grandTotal) * 100)    : 0,
          successPct: grandTotal > 0 ? Math.round((successTotal / grandTotal) * 100) : 0,
        },
        vehicle: {
          fail: vehicleFail,
          success: vehicleSuccessTotal,
          total: vehicleTotal,
          failPct:    vehicleTotal > 0 ? Math.round((vehicleFail / vehicleTotal) * 100)           : 0,
          successPct: vehicleTotal > 0 ? Math.round((vehicleSuccessTotal / vehicleTotal) * 100)   : 0,
        },
        challan: {
          fail: challanFail,
          success: challanSuccessTotal,
          total: challanTotal,
          failPct:    challanTotal > 0 ? Math.round((challanFail / challanTotal) * 100)            : 0,
          successPct: challanTotal > 0 ? Math.round((challanSuccessTotal / challanTotal) * 100)    : 0,
        },
      },
    });
  } catch (error) {
    console.error("adminGetApiStats error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin: Mark selected vehicles as downloaded
 * POST /api/v1/vehicle-for-add/admin/mark-downloaded
 * Body: { vehicleNumbers: ["JK02A5056", ...] }
 */
const adminMarkDownloaded = async (req, res) => {
  try {
    const { vehicleNumbers } = req.body;
    if (!Array.isArray(vehicleNumbers) || vehicleNumbers.length === 0) {
      return res.status(400).json({ status: false, message: "vehicleNumbers array required" });
    }

    const result = await VehicleForAdd.updateMany(
      { vehicleNumber: { $in: vehicleNumbers.map(v => v.toUpperCase().trim()) } },
      { $set: { isDownloaded: true, downloadedAt: new Date() } }
    );

    return res.status(200).json({
      status: true,
      message: `${result.modifiedCount} vehicles marked as downloaded`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error("adminMarkDownloaded error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin: Delete selected vehicles from list
 * DELETE /api/v1/vehicle-for-add/admin/delete
 * Body: { vehicleNumbers: ["JK02A5056", ...] }
 */
const adminDeleteVehiclesForAdd = async (req, res) => {
  try {
    const { vehicleNumbers } = req.body;
    if (!Array.isArray(vehicleNumbers) || vehicleNumbers.length === 0) {
      return res.status(400).json({ status: false, message: "vehicleNumbers array required" });
    }

    const result = await VehicleForAdd.deleteMany({
      vehicleNumber: { $in: vehicleNumbers.map(v => v.toUpperCase().trim()) },
    });

    return res.status(200).json({
      status: true,
      message: `${result.deletedCount} vehicles removed from list`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("adminDeleteVehiclesForAdd error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin: Add vehicle to user's garage directly
 * POST /api/v1/vehicle-for-add/admin/add-to-user-garage
 * Body: { vehicleNumber: "...", userId: "..." }
 */
const adminAddToUserGarage = async (req, res) => {
  try {
    const { vehicleNumber, userId } = req.body;
    if (!vehicleNumber || !userId) {
      return res.status(400).json({ status: false, message: "vehicleNumber and userId are required" });
    }

    // Duplicate check
    const alreadyExists = await User.findOne({
      _id: userId,
      "garage.vehicles.vehicle_id": vehicleNumber,
    }).select("_id");

    if (alreadyExists) {
      return res.status(400).json({
        status: false,
        message: "Vehicle already exists in user garage",
      });
    }

    // Push directly
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          "garage.vehicles": {
            vehicle_id: vehicleNumber,
          },
        },
      }
    );

    // Ensure a dummy VehicleInfoData exists so the frontend doesn't ignore it
    await VehicleInfoData.findOneAndUpdate(
      { vehicle_id: vehicleNumber },
      {
        $setOnInsert: {
          api_data: {
            custom_vehicle_info: {
              rc_number: vehicleNumber,
              owner_name: "Manual Entry Pending",
              vehicle_class: "N/A",
              maker_model: "N/A",
              registration_date: "N/A",
              fitness_upto: "N/A",
              insurance_upto: "N/A",
              pucc_upto: "N/A",
            }
          },
          data_source: "manual",
          last_updated: new Date()
        }
      },
      { upsert: true }
    );

    return res.status(200).json({
      status: true,
      message: "Vehicle added successfully to user garage",
    });
  } catch (error) {
    console.error("adminAddToUserGarage error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

module.exports = {
  adminGetVehiclesForAdd,
  adminGetSuccessVehicles,
  adminGetApiStats,
  adminMarkDownloaded,
  adminDeleteVehiclesForAdd,
  adminAddToUserGarage,
};
