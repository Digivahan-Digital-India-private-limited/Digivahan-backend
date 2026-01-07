const fs = require("fs");
const path = require("path");
const QRAssignment = require("../models/QRAssignment");
const User = require("../models/User");
const { generateQRCode } = require("../middleware/qrgernator");
const { uploadQrToCloudinary } = require("../middleware/cloudinary");
const generateQRTemplate = require("../utils/generateQRTemplate");

const createQrScanner = async (req, res) => {
  try {
    const { unit } = req.body;

    if (!unit || unit < 1 || unit > 50) {
      return res.status(400).json({
        status: false,
        message: "Unit must be between 1 and 50",
      });
    }

    const qrAssignments = [];

    for (let i = 0; i < unit; i++) {
      // 1️⃣ Generate random QR ID
      const qr_id = generateRandomId(10);

      // 2️⃣ Attach with base URL
      const BASE_URL = `https://digivahan-frontend.vercel.app/send-notification/${qr_id}`;

      // 3️⃣ Generate QR buffer
      const qrBuffer = await generateQRCode(BASE_URL);

      // 4️⃣ Upload QR to Cloudinary
      const uploadResult = await uploadQrToCloudinary(qrBuffer, qr_id);

      // 5️⃣ Prepare DB object
      qrAssignments.push({
        qr_id,
        qr_img: uploadResult.secure_url,
        qr_status: "unassigned",
        product_type: "vehicle",
        status: "active",
      });
    }

    // 6️⃣ Bulk insert (FAST & CLEAN 🔥)
    const savedQrs = await QRAssignment.insertMany(qrAssignments);

    res.status(201).json({
      status: true,
      message: `${unit} QR codes generated successfully`,
      data: savedQrs,
    });
  } catch (error) {
    console.error("QR create error:", error);
    res.status(500).json({
      status: false,
      message: "QR generation failed",
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

    if (!qr_id) {
      return res.status(400).json({
        status: false,
        message: "qr_id is required",
      });
    }

    const qrDetails = await QRAssignment.findOne({ qr_id });

    if (!qrDetails) {
      return res.status(404).json({
        status: false,
        message: "QR not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "QR details fetched successfully",
      data: qrDetails,
    });
  } catch (error) {
    console.error("Get QR details error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch QR details",
    });
  }
};

const AssignedQrtoUser = async (req, res) => {
  try {
    const {
      qr_id,
      assign_to, // user_id
      assigned_by, // "user" | "sales"
      product_type, // optional
      sales_id, // optional
      vehicle_id, // optional
    } = req.body;

    // 1️⃣ Basic validation
    if (!qr_id || !assign_to) {
      return res.status(400).json({
        status: false,
        message: "qr_id and assign_to are required",
      });
    }

    // 2️⃣ Find QR
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

    // 3️⃣ Update QR Assignment FIRST ✅
    qr.qr_status = "assigned";
    qr.assign_to = assign_to;
    qr.assigned_by = assigned_by || "user";
    qr.product_type = product_type || qr.product_type;
    qr.sales_id = sales_id || "";
    qr.vehicle_id = vehicle_id || "";
    qr.assigned_at = new Date();

    await qr.save();

    // 4️⃣ Find User
    const user = await User.findById(assign_to);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 5️⃣ Prevent duplicate QR in user
    const alreadyExists = user.qr_list?.some((q) => q.qr_id === qr_id);

    if (alreadyExists) {
      return res.status(400).json({
        status: false,
        message: "QR already exists in user",
      });
    }

    // 6️⃣ Push QR into user's qr_list
    user.qr_list.push({
      qr_id: qr.qr_id,
      qr_img: qr.qr_img,
      product_type: product_type || qr.product_type,
      vehicle_id: vehicle_id || "",
      assigned_date: new Date(),
    });

    await user.save();

    res.status(200).json({
      status: true,
      message: "QR assigned to user successfully",
      data: {
        qr_id: qr.qr_id,
        user_id: assign_to,
      },
    });
  } catch (error) {
    console.error("Assign QR error:", error);
    res.status(500).json({
      status: false,
      message: "QR assignment failed",
    });
  }
};

// Check Qr in user QR List Apis
const CheckQrInUser = async (req, res) => {
  try {
    const { user_id, vehicle_id, qr_id } = req.body;

    // 🔍 Find user
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🧠 Find QR by vehicle_id OR qr_id (jo mile wahi)
    const qrExists = user.qr_list.find((qr) => {
      if (vehicle_id && qr.vehicle_id?.toString() === vehicle_id.toString()) {
        return true;
      }
      if (qr_id && qr._id.toString() === qr_id.toString()) {
        return true;
      }
      return false;
    });

    // ✅ Found
    if (qrExists) {
      return res.status(200).json({
        success: true,
        message: "QR found in user QR list",
        data: qrExists,
      });
    }

    // ❌ Not found
    return res.status(200).json({
      success: false,
      message: "QR not found in user QR list",
    });
  } catch (error) {
    console.error("Check QR in user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const QrCustomTemplateUrl = async (req, res) => {
  try {
    const { qr_id } = req.params;

    if (!qr_id) {
      return res.status(400).json({
        success: false,
        message: "qr_id is required",
      });
    }

    // 1️⃣ Find QR Assignment
    const qrData = await QRAssignment.findOne({ qr_id });

    if (!qrData) {
      return res.status(404).json({
        success: false,
        message: "QR Assignment not found",
      });
    }

    // 2️⃣ Get QR Image URL
    const qrImageUrl = qrData.qr_img;

    if (!qrImageUrl) {
      return res.status(400).json({
        success: false,
        message: "QR image URL not found in record",
      });
    }

    // 3️⃣ Generate Template using QR URL
    const templateUrl = await generateQRTemplate(qrImageUrl);

    // 4️⃣ Success Response
    return res.status(200).json({
      success: true,
      template_url: `${process.env.BASE_URL}${templateUrl}`,
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

    // 1️⃣ QR check
    const qrData = await QRAssignment.findOne({ qr_id });

    if (!qrData) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR code",
      });
    }

    // 2️⃣ Check assign_to
    if (!qrData.assign_to) {
      return res.status(200).json({
        success: false,
        message: "This QR is not assigned to any user",
      });
    }

    // 3️⃣ Find user with profile pic
    const user = await User.findById(qrData.assign_to).select(
      "basic_details.first_name basic_details.last_name basic_details.profile_pic public_details.age public_details.gender public_details.address"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Assigned user not found",
      });
    }

    // 4️⃣ Response
    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: {
        user_id: user._id,
        first_name: user.basic_details.first_name,
        last_name: user.basic_details.last_name,
        profile_pic: user.basic_details.profile_pic,
        age: user.public_details.age,
        gender: user.public_details.gender,
        address: user.public_details.address,
        product_type: qrData.product_type,
        vehicle_id: qrData.vehicle_id,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createQrScanner,
  getQrDetails,
  AssignedQrtoUser,
  CheckQrInUser,
  QrCustomTemplateUrl,
  getUploadedTemplateImage,
  GetUserdetailsThrowTheQRId,
};
