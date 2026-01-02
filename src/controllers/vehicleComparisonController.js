const VehicleComparison = require("../models/VehicleComparison");
const TrendingCars = require("../models/TrendingCarsSchema");
const mongoose = require("mongoose");

const CompareVehicle = async (req, res) => {
  try {
    const { car1_id, car2_id } = req.body;

    // 🔴 validation
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

    // 🔍 find both cars
    const car1 = await TrendingCars.findById(car1_id);
    const car2 = await TrendingCars.findById(car2_id);

    if (!car1 || !car2) {
      return res.status(404).json({
        success: false,
        message: "One or both cars not found",
      });
    }

    // 🧠 pick only required fields
    const car1Data = {
      car_id: car1_id,
      brand_name: car1.brand_name,
      model_name: car1.model_name,
      image_url: car1.car_details?.image_url,
      price_display: car1.car_details?.price_display,
    };

    const car2Data = {
      car_id: car2_id,
      brand_name: car2.brand_name,
      model_name: car2.model_name,
      image_url: car2.car_details?.image_url,
      price_display: car2.car_details?.price_display,
    };

    // 💾 save inside car_data array
    const comparison = await VehicleComparison.create({
      car_data: [
        {
          car_1_data: car1Data,
          car_2_data: car2Data,
        },
      ],
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

    // 🔴 validation
    if (!compare_id || !car_id || !update_car_id) {
      return res.status(400).json({
        success: false,
        message: "compare_id, car_id and update_car_id are required",
      });
    }

    // 1️⃣ find comparison
    const comparison = await VehicleComparison.findById(compare_id);

    if (!comparison || comparison.car_data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comparison data not found",
      });
    }

    // 2️⃣ find updated car
    const updatedCar = await TrendingCars.findById(update_car_id);

    if (!updatedCar) {
      return res.status(404).json({
        success: false,
        message: "Updated car not found",
      });
    }

    // 3️⃣ prepare new data
    const updatedCarData = {
      car_id: update_car_id,
      brand_name: updatedCar.brand_name,
      model_name: updatedCar.model_name,
      image_url: updatedCar.car_details?.image_url,
      price_display: updatedCar.car_details?.price_display,
    };

    // 4️⃣ direct update (NO LOOP needed)
    const compareObj = comparison.car_data[0];

    if (compareObj.car_1_data?.car_id?.toString() === car_id) {
      compareObj.car_1_data = updatedCarData;
    } else if (compareObj.car_2_data?.car_id?.toString() === car_id) {
      compareObj.car_2_data = updatedCarData;
    } else {
      return res.status(404).json({
        success: false,
        message: "Car id not found in comparison",
      });
    }

    // 5️⃣ save
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
    // 🔍 find all comparisons (latest first)
    const comparisons = await VehicleComparison.find().sort({ createdAt: -1 });

    // ❗ no data case
    if (!comparisons || comparisons.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No vehicle comparisons found",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle comparison list fetched successfully",
      total: comparisons.length,
      data: comparisons,
    });
  } catch (error) {
    console.error("Get vehicle comparison list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  CompareVehicle,
  CompareVehicleUpdate,
  getAllvehicleCompairesionList,
};
