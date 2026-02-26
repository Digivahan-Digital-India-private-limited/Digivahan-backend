const User = require("../models/User");
const { deleteFromCloudinary } = require("../middleware/cloudinary");

const UploadvehicleDoc = async (req, res) => {
  try {
    const { user_id, vehicle_id, doc_name, doc_type, doc_number } = req.body;

    const pdfUrl = req.file?.path;
    const publicId = req.file?.filename;

    if (!pdfUrl || !publicId) {
      return res.status(400).json({
        success: false,
        message: "Document upload failed",
      });
    }

    // 1️⃣ Check if doc already exists (FAST)
    const exists = await User.findOne({
      _id: user_id,
      "garage.vehicles.vehicle_id": vehicle_id,
      "garage.vehicles.vehicle_doc.documents.doc_type": doc_type,
    }).select("_id");

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `${doc_type} document already exists`,
      });
    }

    // 2️⃣ Atomic push (FASTEST METHOD)
    const result = await User.updateOne(
      {
        _id: user_id,
        "garage.vehicles.vehicle_id": vehicle_id,
      },
      {
        $push: {
          "garage.vehicles.$.vehicle_doc.documents": {
            doc_name,
            doc_type,
            doc_number,
            doc_url: pdfUrl,
            public_id: publicId,
            uploaded_at: new Date(),
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const deleteVehicleDoc = async (req, res) => {
  try {
    const { user_id, vehicle_id, doc_type } = req.body;

    // ✅ validation
    if (!user_id || !vehicle_id || !doc_type) {
      return res.status(400).json({
        success: false,
        message: "user_id, vehicle_id and doc_type are required",
      });
    }

    // 1️⃣ Find document public_id ONLY (light query)
    const user = await User.findOne(
      {
        _id: user_id,
        "garage.vehicles.vehicle_id": vehicle_id,
        "garage.vehicles.vehicle_doc.documents.doc_type": doc_type,
      },
      {
        "garage.vehicles.$": 1,
      }
    ).lean();

    if (!user || !user.garage?.vehicles?.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle or document not found",
      });
    }

    const vehicle = user.garage.vehicles[0];

    const document = vehicle.vehicle_doc.documents.find(
      (doc) => doc.doc_type === doc_type
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // 2️⃣ Delete from Cloudinary first
    if (document.public_id) {
      await deleteFromCloudinary(document.public_id);
    }

    // 3️⃣ Atomic delete from DB (FASTEST)
    const result = await User.updateOne(
      {
        _id: user_id,
        "garage.vehicles.vehicle_id": vehicle_id,
      },
      {
        $pull: {
          "garage.vehicles.$.vehicle_doc.documents": {
            doc_type: doc_type,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle document deleted successfully",
    });

  } catch (error) {
    console.error("deleteVehicleDoc Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = { UploadvehicleDoc, deleteVehicleDoc };
