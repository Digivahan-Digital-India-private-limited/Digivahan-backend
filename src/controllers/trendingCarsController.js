const TrendingCars = require("../models/TrendingCarsSchema");
const mongoose = require("mongoose");

const addTrendingCar = async (req, res) => {
  try {
    const { brand_name, model_name, ...restBody } = req.body;

    // ✅ Only required field check
    if (!brand_name) {
      return res.status(400).json({
        status: false,
        message: "brand_name is required",
      });
    }

    // 🔥 Save everything user sends
    const car = await TrendingCars.create({
      brand_name,
      model_name: model_name || "",
      car_details: restBody, // 🔥 no duplication
    });

    return res.status(201).json({
      status: true,
      message: "Trending car added successfully",
      data: car,
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
    const cars = await TrendingCars.aggregate([{ $sample: { size: 4 } }])

    return res.status(200).json({
      status: true,
      message: "Trending cars fetched successfully",
      total: cars.length,
      data: cars,
    });
  } catch (error) {
    console.error("Fetch trending cars error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const getCarDetails = async (req, res) => {
  try {
    const { car_id } = req.params;

    // 🔴 validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(car_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid car_id",
      });
    }

    const car = await TrendingCars.findById(car_id);

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

    // 🔴 validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(car_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid car_id",
      });
    }

    const deletedCar = await TrendingCars.findByIdAndDelete(car_id);

    if (!deletedCar) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Car deleted successfully",
      data: deletedCar,
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
