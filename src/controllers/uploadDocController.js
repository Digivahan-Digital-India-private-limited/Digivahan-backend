const User = require("../models/User");
const { deleteFromCloudinary } = require("../middleware/cloudinary");

const UploadvehicleDoc = async (req, res) => {
  try {
    const { user_id, vehicle_id, doc_name, doc_type, doc_number } = req.body;

    // File uploaded from Cloudinary
    const pdfUrl = req.file?.path;
    const publicId = req.file?.filename;

    if (!pdfUrl || !publicId) {
      return res.status(400).json({
        success: false,
        message: "Document upload failed. No file received.",
      });
    }

    // 1️⃣ Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Find vehicle inside user's garage
    const vehicle = user.garage.vehicles.find(
      (v) => v.vehicle_id === vehicle_id
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in user's garage",
      });
    }

    // 3️⃣ Check if document with same doc_type already exists ❗
    const isDocAlreadyExists = vehicle.vehicle_doc.documents.some(
      (doc) => doc.doc_type === doc_type
    );

    if (isDocAlreadyExists) {
      return res.status(409).json({
        success: false,
        message: `Document with type '${doc_type}' already available`,
      });
    }

    // 4️⃣ Push document inside vehicle_doc.documents ✅
    vehicle.vehicle_doc.documents.push({
      doc_name,
      doc_type,
      doc_number,
      doc_url: pdfUrl,
      public_id: publicId,
    });

    // 5️⃣ Save user
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle document uploaded successfully",
      data: vehicle.vehicle_doc.documents.at(-1),
    });
  } catch (error) {
    console.log("UploadvehicleDoc Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


const deleteVehicleDoc = async (req, res) => {
  try {
    const { user_id, vehicle_id, doc_type } = req.body;

    // 1️⃣ Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Find vehicle in user's garage
    const vehicle = user.garage.vehicles.find(
      (v) => v.vehicle_id === vehicle_id
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in user's garage",
      });
    }

    // 3️⃣ Find document index inside vehicle_doc.documents
    const docIndex = vehicle.vehicle_doc.documents.findIndex(
      (doc) => doc.doc_type === doc_type
    );

    if (docIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Document not found for this vehicle",
      });
    }

    const document = vehicle.vehicle_doc.documents[docIndex];

    // 4️⃣ Delete from Cloudinary
    if (document.public_id) {
      await deleteFromCloudinary(document.public_id);
    }

    // 5️⃣ Remove document from documents array
    vehicle.vehicle_doc.documents.splice(docIndex, 1);

    // 6️⃣ Save user
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle document deleted successfully",
    });
  } catch (error) {
    console.error("deleteVehicleDoc Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { UploadvehicleDoc, deleteVehicleDoc };
