const TrendingCars = require("../models/TrendingCarsSchema");
const mongoose = require("mongoose");

const addTrendingCar = async (req, res) => {
  try {
    const { brand_name, model_name = "", ...restBody } = req.body;

    if (!brand_name) {
      return res.status(400).json({
        status: false,
        message: "brand_name is required",
      });
    }

    // 🔥 Prevent duplicate (optional but recommended)
    const exists = await TrendingCars.findOne({
      brand_name,
      model_name,
    }).select("_id");

    if (exists) {
      return res.status(409).json({
        status: false,
        message: "Car already exists",
      });
    }

    const car = await TrendingCars.create({
      brand_name,
      model_name,
      car_details: restBody,
    });

    return res.status(201).json({
      status: true,
      message: "Trending car added successfully",
      data: car.toObject(), // lighter response
    });
  } catch (error) {
    console.error("Add trending car error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const fetchcardDetails = async (req, res) => {
  try {
    const limit = 4;
    const rand = Math.random();

    let cars = await TrendingCars.find({
      randomKey: { $gte: rand },
    })
      .limit(limit)
      .sort({ randomKey: 1 })
      .lean();

    // 🔥 If not enough cars found, fetch from beginning
    if (cars.length < limit) {
      const remaining = limit - cars.length;

      const extraCars = await TrendingCars.find({
        randomKey: { $lt: rand },
      })
        .limit(remaining)
        .sort({ randomKey: 1 })
        .lean();

      cars = [...cars, ...extraCars];
    }

    return res.status(200).json({
      status: true,
      message: "Random trending cars fetched successfully",
      total: cars.length,
      data: cars,
    });
  } catch (error) {
    console.error("Fetch random cars error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};


const getCarDetails = async (req, res) => {
  try {
    const { car_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(car_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid car_id",
      });
    }

    const car = await TrendingCars.findById(car_id)
      .select("-__v") // remove unnecessary field
      .lean();

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: car,
    });
  } catch (error) {
    console.error("Get car details error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const DeleteCarDetails = async (req, res) => {
  try {
    const { car_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(car_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid car_id",
      });
    }

    const result = await TrendingCars.deleteOne({ _id: car_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Car deleted successfully",
    });
  } catch (error) {
    console.error("Delete car error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = {
  addTrendingCar,
  fetchcardDetails,
  getCarDetails,
  DeleteCarDetails,
};
