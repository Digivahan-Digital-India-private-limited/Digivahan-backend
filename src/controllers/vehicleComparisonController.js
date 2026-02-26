const VehicleComparison = require("../models/VehicleComparison");
const TrendingCars = require("../models/TrendingCarsSchema");
const mongoose = require("mongoose");

const CompareVehicle = async (req, res) => {
  try {
    const { car1_id, car2_id } = req.body;

    if (!car1_id || !car2_id) {
      return res.status(400).json({
        success: false,
        message: "Both car1_id and car2_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(car1_id) ||
      !mongoose.Types.ObjectId.isValid(car2_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid car id",
      });
    }

    // 🔥 Check both cars exist (parallel query)
    const [car1, car2] = await Promise.all([
      TrendingCars.exists({ _id: car1_id }),
      TrendingCars.exists({ _id: car2_id }),
    ]);

    if (!car1 || !car2) {
      return res.status(404).json({
        success: false,
        message: "One or both cars not found",
      });
    }

    const comparison = await VehicleComparison.create({
      car_1: car1_id,
      car_2: car2_id,
    });

    return res.status(201).json({
      success: true,
      message: "Vehicle comparison saved successfully",
      data: comparison,
    });
  } catch (error) {
    console.error("Compare vehicle error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const CompareVehicleUpdate = async (req, res) => {
  try {
    const { compare_id, car_id, update_car_id } = req.body;

    if (!compare_id || !car_id || !update_car_id) {
      return res.status(400).json({
        success: false,
        message: "compare_id, car_id and update_car_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(compare_id) ||
      !mongoose.Types.ObjectId.isValid(car_id) ||
      !mongoose.Types.ObjectId.isValid(update_car_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ids",
      });
    }

    const compareObjectId = new mongoose.Types.ObjectId(compare_id);
    const carObjectId = new mongoose.Types.ObjectId(car_id);
    const updateCarObjectId = new mongoose.Types.ObjectId(update_car_id);

    // 🔥 Check updated car exists
    const updatedCarExists = await TrendingCars.exists({
      _id: updateCarObjectId,
    });

    if (!updatedCarExists) {
      return res.status(404).json({
        success: false,
        message: "Updated car not found",
      });
    }

    // 🔥 Find comparison
    const comparison = await VehicleComparison.findOne({
      _id: compareObjectId,
      $or: [{ car_1: carObjectId }, { car_2: carObjectId }],
    });

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: "Comparison not found or car not matched",
      });
    }

    // 🔥 Update correct field
    if (comparison.car_1.equals(carObjectId)) {
      comparison.car_1 = updateCarObjectId;
    } else if (comparison.car_2.equals(carObjectId)) {
      comparison.car_2 = updateCarObjectId;
    }

    await comparison.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: comparison,
    });
  } catch (error) {
    console.error("Compare vehicle update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const getAllvehicleCompairesionList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comparisons = await VehicleComparison.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "car_1",
        select:
          "brand_name model_name car_details.image_url car_details.price_display",
      })
      .populate({
        path: "car_2",
        select:
          "brand_name model_name car_details.image_url car_details.price_display",
      })
      .lean();

    const total = await VehicleComparison.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Vehicle comparison list fetched successfully",
      total,
      page,
      limit,
      data: comparisons,
    });
  } catch (error) {
    console.error("Get vehicle comparison list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  CompareVehicle,
  CompareVehicleUpdate,
  getAllvehicleCompairesionList,
};
