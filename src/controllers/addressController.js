const User = require("../models/User");
const mongoose = require("mongoose")

const UserAddAddress = async (req, res) => {
  try {
    const {
      user_id,
      name,
      contact_no,
      house_no_building,
      road_or_area,
      street_name,
      pincode,
      city,
      state,
      landmark,
      default_status = false,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    const newAddress = {
      name: name?.trim() || "",
      contact_no: contact_no?.trim() || "",
      house_no_building: house_no_building?.trim() || "",
      road_or_area: road_or_area?.trim() || "",
      street_name: street_name?.trim() || "",
      pincode: pincode?.trim() || "",
      city: city?.trim() || "",
      state: state?.trim() || "",
      landmark: landmark?.trim() || "",
      default_status,
    };

    // If new address is default → unset old default (atomic)
    if (default_status === true) {
      await User.updateOne(
        { _id: user_id },
        { $set: { "address_book.$[].default_status": false } },
      );
    }

    // Push new address
    const result = await User.updateOne(
      { _id: user_id },
      { $push: { address_book: newAddress } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(201).json({
      status: true,
      message: "Address added successfully",
      data: newAddress,
    });
  } catch (error) {
    console.error("UserAddAddress Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const UpdateUserAddress = async (req, res) => {
  try {
    const {
      user_id,
      address_id,
      name,
      contact_no,
      house_no_building,
      street_name,
      road_or_area,
      pincode,
      city,
      state,
      landmark,
    } = req.body;

    // ✅ Validation
    if (!user_id || !address_id) {
      return res.status(400).json({
        status: false,
        message: "user_id and address_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(address_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid ID format",
      });
    }

    // ✅ Step 1: Reset all default_status = false
    await User.updateOne(
      { _id: user_id },
      {
        $set: {
          "address_book.$[].default_status": false,
        },
      },
    );

    // ✅ Step 2: Update selected address and set default_status = true
    const updateFields = {};

    if (name) updateFields["address_book.$.name"] = name.trim();
    if (contact_no)
      updateFields["address_book.$.contact_no"] = contact_no.trim();
    if (house_no_building)
      updateFields["address_book.$.house_no_building"] =
        house_no_building.trim();
    if (street_name)
      updateFields["address_book.$.street_name"] = street_name.trim();
    if (road_or_area)
      updateFields["address_book.$.road_or_area"] = road_or_area.trim();
    if (pincode) updateFields["address_book.$.pincode"] = pincode.trim();
    if (city) updateFields["address_book.$.city"] = city.trim();
    if (state) updateFields["address_book.$.state"] = state.trim();
    if (landmark) updateFields["address_book.$.landmark"] = landmark.trim();

    updateFields["address_book.$.default_status"] = true;

    const result = await User.updateOne(
      {
        _id: user_id,
        "address_book._id": address_id,
      },
      {
        $set: updateFields,
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    // ✅ Step 3: Return updated address list (lightweight)
    const updatedUser = await User.findById(user_id)
      .select("address_book basic_details.profile_completion_percent")
      .lean();

    return res.status(200).json({
      status: true,
      message: "Address updated successfully",
      profile_completion_percent:
        updatedUser.basic_details.profile_completion_percent,
      address_book: updatedUser.address_book,
    });
  } catch (error) {
    console.error("UpdateUserAddress error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const DeleteUserAddress = async (req, res) => {
  try {
    const { user_id, address_id } = req.body;

    // ✅ Validation
    if (!user_id || !address_id) {
      return res.status(400).json({
        status: false,
        message: "user_id and address_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(address_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid ID format",
      });
    }

    // ✅ Step 1: Check if deleting address is default
    const user = await User.findOne(
      {
        _id: user_id,
        "address_book._id": address_id,
      },
      {
        "address_book.$": 1,
      }
    ).lean();

    if (!user || user.address_book.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    const isDeletingDefault = user.address_book[0].default_status;

    // ✅ Step 2: Remove address (atomic)
    await User.updateOne(
      { _id: user_id },
      {
        $pull: {
          address_book: { _id: address_id },
        },
      }
    );

    // ✅ Step 3: If default deleted → set first address as default
    if (isDeletingDefault) {
      const firstAddress = await User.findOne(
        { _id: user_id, "address_book.0": { $exists: true } },
        { "address_book._id": 1 }
      ).lean();

      if (firstAddress?.address_book?.length > 0) {
        await User.updateOne(
          {
            _id: user_id,
            "address_book._id": firstAddress.address_book[0]._id,
          },
          {
            $set: {
              "address_book.$.default_status": true,
            },
          }
        );
      }
    }

    // ✅ Step 4: Return updated address list
    const updatedUser = await User.findById(user_id)
      .select("address_book")
      .lean();

    return res.status(200).json({
      status: true,
      message: "Address deleted successfully",
      address_book: updatedUser.address_book,
    });

  } catch (error) {
    console.error("DeleteUserAddress error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};


module.exports = { UserAddAddress, UpdateUserAddress, DeleteUserAddress };
