const VehicleForAdd = require("../models/VehicleForAdd");
const mongoose = require("mongoose");

/**
 * Admin: Get all "Vehicle For Add" records (3rd party API had no data)
 * GET /api/v1/vehicle-for-add/admin/list
 * Query: ?page=1&limit=50&filter=all|pending|downloaded&search=JK02
 */
const adminGetVehiclesForAdd = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 50;
    const filter = req.query.filter || "all"; // all | pending | downloaded
    const search = (req.query.search || "").trim().toUpperCase();
    const apiType = req.query.apiType || "ALL"; // ALL | VEHICLE | CHALLAN
    const skip   = (page - 1) * limit;

    const query = {};
    if (filter === "pending")    query.isDownloaded = false;
    if (filter === "downloaded") query.isDownloaded = true;
    if (apiType === "VEHICLE")   query.failedApis = "VEHICLE";
    if (apiType === "CHALLAN")   query.failedApis = "CHALLAN";
    if (search)                  query.vehicleNumber = { $regex: search, $options: "i" };

    const [total, records] = await Promise.all([
      VehicleForAdd.countDocuments(query),
      VehicleForAdd.find(query)
        .sort({ isDownloaded: 1, lastFailedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      status: true,
      message: "Vehicles fetched successfully",
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages:      Math.ceil(total / limit) || 1,
        pendingCount:    await VehicleForAdd.countDocuments({ isDownloaded: false }),
        downloadedCount: await VehicleForAdd.countDocuments({ isDownloaded: true }),
        vehicleCount:    await VehicleForAdd.countDocuments({ failedApis: "VEHICLE" }),
        challanCount:    await VehicleForAdd.countDocuments({ failedApis: "CHALLAN" }),
      },
    });
  } catch (error) {
    console.error("adminGetVehiclesForAdd error:", error);
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

module.exports = {
  adminGetVehiclesForAdd,
  adminMarkDownloaded,
  adminDeleteVehiclesForAdd,
};
