const fs = require("fs");
const path = require("path");
const QRAssignment = require("../models/QRAssignment");
const User = require("../models/User");
const { generateQRCode } = require("../middleware/qrgernator");
const {
  uploadQrToCloudinary,
  deleteFromCloudinary,
} = require("../middleware/cloudinary");
const generateQRTemplate = require("../utils/generateQRTemplate");
const zipAndClearFiles = require("../utils/zipAndClearFiles");

const createQrScanner = async (req, res) => {
  try {
    const { unit } = req.body;

    if (!unit || unit < 1 || unit > 100) {
      return res.status(400).json({
        status: false,
        message: "Unit must be between 1 and 100",
      });
    }

    // 🔥 get sequence numbers safely
    const qrNumbers = await QRAssignment.getNextQrSequence(unit);

    // 🔥 parallel QR generation
    const qrPromises = qrNumbers.map(async (qr_no) => {
      const qr_id = generateRandomId(10);

      const BASE_URL = `https://digicapital.co.in/send-notification/${qr_id}`;

      const qrBuffer = await generateQRCode(BASE_URL);

      const uploadResult = await uploadQrToCloudinary(qrBuffer, qr_id);

      return {
        qr_no,
        qr_id,
        qr_img: uploadResult.secure_url,
        qr_image_public_id: uploadResult.public_id,

        qr_status: "unassigned",

        product_type: "vehicle",

        status: "active",

        is_printed: false,
      };
    });

    const qrAssignments = await Promise.all(qrPromises);

    // 🔥 bulk insert optimized
    const savedQrs = await QRAssignment.insertMany(qrAssignments, {
      ordered: false,
    });

    return res.status(201).json({
      status: true,
      message: `${savedQrs.length} QR codes generated successfully`,
      count: savedQrs.length,
      data: savedQrs,
    });
  } catch (error) {
    console.error("QR create error:", error);

    return res.status(500).json({
      status: false,
      message: "QR generation failed",
      error: error.message,
    });
  }
};

const generateRandomId = (length = 10) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

const getQrDetails = async (req, res) => {
  try {
    const { qr_id } = req.params;

    /* ===============================
       1️⃣ Validate input
    =============================== */

    if (!qr_id || typeof qr_id !== "string") {
      return res.status(400).json({
        status: false,
        message: "Valid qr_id is required",
      });
    }

    /* ===============================
       2️⃣ Fetch QR using indexed field
    =============================== */

    const qrDetails = await QRAssignment.findOne(
      { qr_id },
      {
        _id: 1,
        qr_no: 1,
        qr_id: 1,
        qr_img: 1,
        qr_status: 1,
        product_type: 1,
        vehicle_id: 1,
        status: 1,
        assigned_to: 1,
        assigned_at: 1,
        is_printed: 1,
        printed_at: 1,
        createdAt: 1,
      },
    ).lean(); // 🔥 improves performance significantly

    /* ===============================
       3️⃣ Not found handling
    =============================== */

    if (!qrDetails) {
      return res.status(404).json({
        status: false,
        message: "QR not found",
      });
    }

    /* ===============================
       4️⃣ Optional: block inactive/damaged QR
    =============================== */

    if (qrDetails.status !== "active") {
      return res.status(400).json({
        status: false,
        message: `QR is ${qrDetails.status}`,
      });
    }

    /* ===============================
       5️⃣ Success response
    =============================== */

    return res.status(200).json({
      status: true,
      message: "QR details fetched successfully",
      data: qrDetails,
    });
  } catch (error) {
    console.error("Get QR details error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch QR details",
      error: error.message,
    });
  }
};

const AssignedQrtoUser = async (req, res) => {
  try {
    const {
      qr_id,
      assign_to,
      assigned_by = "user",
      product_type,
      sales_id = null,
      vehicle_id = null,
    } = req.body;

    /* ===============================
       1️⃣ Validate input
    =============================== */

    if (!qr_id || !assign_to) {
      return res.status(400).json({
        status: false,
        message: "qr_id and assign_to are required",
      });
    }

    /* ===============================
       2️⃣ Find QR master record
    =============================== */

    const qr = await QRAssignment.findOne({ qr_id });

    if (!qr) {
      return res.status(404).json({
        status: false,
        message: "QR not found",
      });
    }

    if (qr.qr_status === "assigned") {
      return res.status(400).json({
        status: false,
        message: "QR already assigned",
      });
    }

    /* ===============================
       3️⃣ Find user
    =============================== */

    const user = await User.findById(assign_to);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const isVehicleProduct = product_type === "vehicle";

    /* ===============================
       4️⃣ VEHICLE ASSIGNMENT
    =============================== */

    if (isVehicleProduct) {
      if (!vehicle_id) {
        return res.status(400).json({
          status: false,
          message: "vehicle_id required",
        });
      }

      const vehicle = user.garage?.vehicles?.find(
        (v) => v.vehicle_id === vehicle_id,
      );

      if (!vehicle) {
        return res.status(404).json({
          status: false,
          message: "Vehicle not found in garage",
        });
      }

      /* prevent duplicate */
      if (vehicle.qr_list.includes(qr_id)) {
        return res.status(400).json({
          status: false,
          message: "QR already assigned to this vehicle",
        });
      }

      /* ===============================
         5️⃣ LIMIT = MAX 2 QR PER VEHICLE
      =============================== */

      if (vehicle.qr_list.length >= 2) {
        const oldestQrId = vehicle.qr_list.shift();

        /* find full QR to delete image */
        const oldQr = await QRAssignment.findOne({
          qr_id: oldestQrId,
        });

        if (oldQr?.qr_image_public_id) {
          await deleteFromCloudinary(oldQr.qr_image_public_id);
        }

        /* delete from master */
        await QRAssignment.deleteOne({
          qr_id: oldestQrId,
        });
      }

      /* add new qr reference */
      vehicle.qr_list.push(qr_id);
    } else {
      /* ===============================
         6️⃣ NON VEHICLE ASSIGNMENT
      =============================== */

      if (user.qr_list.includes(qr_id)) {
        return res.status(400).json({
          status: false,
          message: "QR already assigned to user",
        });
      }

      user.qr_list.push(qr_id);
    }

    /* ===============================
       7️⃣ UPDATE MASTER QR
    =============================== */

    qr.qr_status = "assigned";
    qr.assigned_to = assign_to;
    qr.assigned_by = assigned_by;
    qr.product_type = product_type;
    qr.vehicle_id = vehicle_id || null;
    qr.sales_id = sales_id;
    qr.assigned_at = new Date();

    await qr.save();

    await user.save();

    /* ===============================
       8️⃣ SUCCESS RESPONSE
    =============================== */

    return res.status(200).json({
      status: true,
      message: "QR assigned successfully",
      data: {
        qr_id,
        assigned_to: assign_to,
        vehicle_id,
        product_type,
      },
    });
  } catch (error) {
    console.error("Assign QR error:", error);

    return res.status(500).json({
      status: false,
      message: "QR assignment failed",
      error: error.message,
    });
  }
};

// ✅ Check QR in User (Garage OR Direct QR List)
const CheckQrInUser = async (req, res) => {
  try {
    const { user_id, vehicle_id, qr_id } = req.body;

    /* ===============================
       1️⃣ Validate user_id
    =============================== */

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    /* ===============================
       2️⃣ Find user (lean = faster)
    =============================== */

    const user = await User.findById(user_id)
      .select("qr_list garage.vehicles.vehicle_id garage.vehicles.qr_list")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* ===============================
       CASE 1️⃣ vehicle_id provided
    =============================== */

    if (vehicle_id) {
      const vehicle = user.garage?.vehicles?.find(
        (v) => v.vehicle_id === vehicle_id,
      );

      if (!vehicle || !vehicle.qr_list?.length) {
        return res.status(404).json({
          success: false,
          message: "QR not found for this vehicle",
        });
      }

      const firstQrId = vehicle.qr_list[0];

      /* fetch full QR details from master */
      const qrDetails = await QRAssignment.findOne({
        qr_id: firstQrId,
      }).lean();

      if (!qrDetails) {
        return res.status(404).json({
          success: false,
          message: "QR assignment not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "QR found successfully",
        data: qrDetails,
      });
    }

    /* ===============================
       CASE 2️⃣ qr_id provided
    =============================== */

    if (qr_id) {
      const exists = user.qr_list?.includes(qr_id);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "QR not found in user account",
        });
      }

      /* fetch full QR details */
      const qrDetails = await QRAssignment.findOne({
        qr_id,
      }).lean();

      if (!qrDetails) {
        return res.status(404).json({
          success: false,
          message: "QR assignment not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "QR found successfully",
        data: qrDetails,
      });
    }

    /* ===============================
       3️⃣ Nothing provided
    =============================== */

    return res.status(400).json({
      success: false,
      message: "vehicle_id or qr_id is required",
    });
  } catch (error) {
    console.error("Check QR error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const CreateQrTemplateInBulk = async (req, res) => {
  try {
    const { template_type } = req.body;
    const qrList = await QRAssignment.find({
      is_printed: false,
      qr_status: "unassigned",
    }).sort({ createdAt: 1 });

    if (!qrList.length) {
      return res.status(404).json({
        success: false,
        message: "No new QR available for printing",
      });
    }

    const templatePaths = [];

    // Generate templates
    for (const qr of qrList) {
      if (!qr.qr_img) continue;
      const templatePath = await generateQRTemplate(
        qr.qr_img,
        qr.qr_no,
        template_type,
      );
      // expected: "/uploads/template_xxx.png"
      templatePaths.push(templatePath);
    }

    if (!templatePaths.length) {
      return res.status(400).json({
        success: false,
        message: "No templates generated",
      });
    }

    // Zip all templates & delete originals
    const zipRelativePath = await zipAndClearFiles(templatePaths);

    // Mark QRs as printed
    const ids = qrList.map((q) => q._id);
    await QRAssignment.updateMany(
      { _id: { $in: ids } },
      { $set: { is_printed: true, printed_at: new Date() } },
    );

    return res.status(200).json({
      success: true,
      total_printed: qrList.length,
      download_zip: `${process.env.BASE_URL}${zipRelativePath}`,
      message: "All QR templates downloaded & originals cleared",
    });
  } catch (error) {
    console.error("QrCustomURL Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getUploadedTemplateImage = (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "../../uploads");

    if (!fs.existsSync(uploadsDir)) {
      return res.json({ success: true, images: [] });
    }

    const files = fs.readdirSync(uploadsDir);

    const images = files
      .filter((file) => file.match(/\.(png|jpg|jpeg|webp)$/i))
      .map((file) => ({
        name: file,
        url: `${process.env.BASE_URL}/uploads/${file}`,
      }));

    return res.json({
      success: true,
      count: images.length,
      images,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const GetUserdetailsThrowTheQRId = async (req, res) => {
  try {
    const { qr_id } = req.params;

    /* ===============================
       1️⃣ Validate input
    =============================== */

    if (!qr_id || typeof qr_id !== "string") {
      return res.status(400).json({
        success: false,
        error_type: "INVALID_INPUT",
        message: "Valid qr_id is required",
      });
    }

    /* ===============================
       2️⃣ Find QR master record
       (uses indexed field → very fast)
    =============================== */

    const qrData = await QRAssignment.findOne(
      { qr_id },
      {
        assigned_to: 1,
        product_type: 1,
        vehicle_id: 1,
      },
    ).lean();

    if (!qrData) {
      return res.status(404).json({
        success: false,
        error_type: "INVALID_QR",
        message: "Invalid QR code",
      });
    }

    /* ===============================
       3️⃣ Check assigned
    =============================== */

    if (!qrData.assigned_to) {
      return res.status(200).json({
        success: false,
        error_type: "NOT_ASSIGNED",
        message: "This QR is not assigned to any user",
      });
    }

    /* ===============================
       4️⃣ Fetch user (minimal fields)
    =============================== */

    const user = await User.findById(qrData.assigned_to, {
      "basic_details.phone_number": 1,
      "public_details.nick_name": 1,
      "public_details.public_pic": 1,
      "public_details.age": 1,
      "public_details.gender": 1,
      "public_details.address": 1,
      emergency_contacts: 1,
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error_type: "USER_NOT_FOUND",
        message: "Assigned user not found",
      });
    }

    /* ===============================
       5️⃣ Success response
    =============================== */

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",

      data: {
        user_id: qrData.assigned_to,

        phone_number: user.basic_details?.phone_number || "",

        full_name: user.public_details?.nick_name || "",

        profile_pic: user.public_details?.public_pic || "",

        age: user.public_details?.age || "",

        gender: user.public_details?.gender || "",

        address: user.public_details?.address || "",

        product_type: qrData.product_type,

        vehicle_id: qrData.vehicle_id || null,

        emergency_contacts: user.emergency_contacts || [],
      },
    });
  } catch (error) {
    console.error("QR scan user fetch error:", error);

    return res.status(500).json({
      success: false,
      error_type: "SERVER_ERROR",
      message: "Internal server error",
    });
  }
};

const CreateSingleQRTemplate = async (req, res) => {
  try {
    const { qr_id } = req.params;
    const { template_type = "default" } = req.body;

    /* ===============================
       1️⃣ Validate input
    =============================== */

    if (!qr_id || typeof qr_id !== "string") {
      return res.status(400).json({
        success: false,
        error_type: "INVALID_INPUT",
        message: "Valid qr_id is required",
      });
    }

    /* ===============================
       2️⃣ Fetch QR (lean for performance)
    =============================== */

    const qrData = await QRAssignment.findOne(
      { qr_id },
      {
        qr_no: 1,
        qr_img: 1,
        qr_status: 1,
        assigned_to: 1,
        is_printed: 1,
      },
    ).lean();

    if (!qrData) {
      return res.status(404).json({
        success: false,
        error_type: "QR_NOT_FOUND",
        message: "QR Assignment not found",
      });
    }

    if (qrData.qr_status !== "assigned") {
      return res.status(400).json({
        success: false,
        error_type: "QR_NOT_ASSIGNED",
        message: "QR is not assigned yet",
      });
    }

    if (!qrData.assigned_to) {
      return res.status(400).json({
        success: false,
        error_type: "NO_USER_LINKED",
        message: "QR is not linked to any user",
      });
    }

    if (!qrData.qr_img) {
      return res.status(400).json({
        success: false,
        error_type: "QR_IMAGE_MISSING",
        message: "QR image not found",
      });
    }

    /* ===============================
       3️⃣ Generate template
    =============================== */

    const templatePath = await generateQRTemplate(
      qrData.qr_img,
      qrData.qr_no,
      template_type,
    );

    if (!templatePath) {
      return res.status(500).json({
        success: false,
        error_type: "TEMPLATE_FAILED",
        message: "Template generation failed",
      });
    }

    /* ===============================
       4️⃣ Update print status (atomic)
    =============================== */

    await QRAssignment.updateOne(
      { qr_id },
      {
        $set: {
          is_printed: true,
          printed_at: new Date(),
        },
      },
    );

    /* ===============================
       5️⃣ Success response
    =============================== */

    return res.status(200).json({
      success: true,
      message: "QR template generated and marked as printed",

      data: {
        qr_id,
        qr_no: qrData.qr_no,
        template_type,
        template_url: `${process.env.BASE_URL}${templatePath}`,
        is_printed: true,
        printed_at: new Date(),
      },
    });
  } catch (error) {
    console.error("CreateSingleQRTemplate Error:", error);

    return res.status(500).json({
      success: false,
      error_type: "SERVER_ERROR",
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createQrScanner,
  getQrDetails,
  AssignedQrtoUser,
  CheckQrInUser,
  CreateQrTemplateInBulk,
  CreateSingleQRTemplate,
  getUploadedTemplateImage,
  GetUserdetailsThrowTheQRId,
};
