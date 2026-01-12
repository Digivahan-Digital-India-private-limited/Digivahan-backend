const User = require("../models/User");
const axios = require("axios");
const mongoose = require("mongoose");

const sendNotification = async (req, res) => {
  try {
    let {
      sender_id, // ❗ optional (web me nahi aayega)
      receiver_id, // ✅ always required
      notification_type,
      notification_title,
      link,
      vehicle_id,
      order_id,
      message,
      issue_type,
      chat_room_id,
      latitude,
      longitude,
      incident_proof,
      inapp_notification,
      seen_status,
    } = req.body;

    const GUEST_ID = process.env.GUEST_QR_USER_ID;
    const isGuestCase = !sender_id; // 🌐 WEB CASE

    /* -----------------------------
       1️⃣ RESOLVE SENDER (APP vs WEB)
    ------------------------------ */

    let sender;
    let senderName = "Guest User";
    let senderPic = "";

    if (sender_id) {
      // 🟢 APP CASE
      sender = await User.findById(sender_id).select(
        "basic_details.first_name basic_details.last_name basic_details.profile_pic"
      );

      if (!sender) {
        return res.status(404).json({
          status: false,
          message: "Sender not found",
        });
      }

      senderName = `${sender.basic_details.first_name || ""} ${
        sender.basic_details.last_name || ""
      }`.trim();

      senderPic = sender.basic_details.profile_pic || "";
    } else {
      // 🌐 WEB / GUEST CASE
      sender_id = GUEST_ID;

      sender = await User.findById(sender_id).select(
        "basic_details.first_name basic_details.last_name basic_details.profile_pic"
      );

      if (sender) {
        senderName = `${sender.basic_details.first_name || "Guest"} ${
          sender.basic_details.last_name || ""
        }`.trim();
        senderPic = sender.basic_details.profile_pic || "";
      }
    }

    /* -----------------------------
       2️⃣ FIND RECEIVER
    ------------------------------ */

    const receiver = await User.findById(receiver_id);

    if (!receiver) {
      return res.status(404).json({
        status: false,
        message: "Receiver not found",
      });
    }

    /* -----------------------------
       3️⃣ 🚨 GUEST LIMIT VALIDATION
       Max 3 notifications / 24 hrs
    ------------------------------ */

    if (isGuestCase) {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const guestNotificationCount = receiver.notifications.filter(
        (n) =>
          n.sender_id?.toString() === GUEST_ID &&
          new Date(n.time || receiver.updated_at) > last24Hours
      ).length;

      if (guestNotificationCount >= 3) {
        return res.status(429).json({
          status: false,
          message:
            "You have reached the maximum limit of notifications for today",
        });
      }
    }

    /* -----------------------------
       4️⃣ NORMALIZE INCIDENT PROOF
    ------------------------------ */

    const incidentProofArray = Array.isArray(incident_proof)
      ? incident_proof
      : incident_proof
      ? [incident_proof]
      : [];

    /* -----------------------------
       5️⃣ SAVE NOTIFICATION (DB)
    ------------------------------ */

    receiver.notifications.push({
      sender_id,
      sender_pic: senderPic,
      name: senderName,
      notification_type,
      notification_title,
      link,
      vehicle_id,
      order_id,
      message,
      issue_type,
      chat_room_id,
      latitude,
      longitude,
      incident_proof: incidentProofArray,
      inapp_notification,
      seen_status,
      time: new Date(), // 🔥 IMPORTANT for limit check
    });

    await receiver.save();

    const savedNotification = receiver.notifications.at(-1);

    /* -----------------------------
       6️⃣ ANDROID CHANNEL LOGIC
    ------------------------------ */

    const ANDROID_CHANNEL_MAP = {
      no_parking: "0b251d79-aa58-4410-ac8b-a810849ce1c6",
      congested_parking: "5fbca66a-703c-459e-bcfa-c3815f25b2bb",
      road_block_alert: "1f097e17-2009-4dd5-b27e-cb84a52cb7c5",
      blocked_vehicle_alert: "80a16cd8-e359-43be-8ea5-d31ddfab6338",
      car_lights_windows_left_open: "d13bad07-8593-4603-960e-e140317410db",
      car_horn_alarm_going_on: "8bd1c0ed-7865-4f41-9f95-81a9b37310b8",
      unknown_issue_alert: "5bd7c478-55c0-42a7-b87f-472c0013ec1f",
      doc_access: "b4258f1b-b16e-4d8b-920f-fdcc394eb79f",
      accident_alert: "99fdc63d-21f4-42a3-bb3d-5d9c4398c594",
    };

    const DEFAULT_ANDROID_CHANNEL = "328b98de-49cc-47b2-85b4-733547c953d4";

    let androidChannelId = DEFAULT_ANDROID_CHANNEL;

    if (receiver.is_notification_sound_on === true) {
      androidChannelId =
        ANDROID_CHANNEL_MAP[issue_type] || DEFAULT_ANDROID_CHANNEL;
    }

    /* -----------------------------
       7️⃣ SEND ONESIGNAL PUSH
    ------------------------------ */

    await sendOneSignalNotification({
      externalUserId: receiver._id.toString(),
      title: notification_title,
      message,
      data: {
        sender_id,
        notification_type,
        order_id: order_id || "",
        vehicle_id: vehicle_id || "",
        chat_room_id: chat_room_id || "",
        issue_type: issue_type || "",
        latitude: latitude || "",
        longitude: longitude || "",
      },
      androidChannelId,
    });

    return res.status(201).json({
      status: true,
      message: "Notification sent successfully",
      data: savedNotification,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const sendNotificationForCall = async (req, res) => {
  try {
    const { sender_id, receiver_id } = req.body;

    let message = "Incoming call Request";
    let sender;
    let senderName = "Unknow User";

    if (sender_id) {
      sender = await User.findById(sender_id).select(
        "basic_details.first_name basic_details.last_name"
      );

      if (!sender) {
        return res.status(404).json({
          status: false,
          message: "Sender not found",
        });
      }

      senderName = `${sender.basic_details.first_name || ""} ${
        sender.basic_details.last_name || ""
      }`.trim();
    }

    const receiver = await User.findById(receiver_id);

    if (!receiver) {
      return res.status(404).json({
        status: false,
        message: "Receiver not found",
      });
    }

    const androidChannelId = "0f86d5a8-1877-4a8a-ad45-d609c14d16bd";

    await sendOneSignalNotification({
      externalUserId: receiver._id.toString(),
      title: senderName,
      message,
      data: {
        sender_id,
      },
      androidChannelId,
    });

    return res.status(201).json({
      status: true,
      message: "Notification sent successfully",
      details: {
        sender_id,
        senderName: senderName,
        message,
      },
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const sendSMSNotificationToUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });
    }

    // 1. Find user
    const user = await User.findById(user_id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 3. Get phone number
    const phone = user?.basic_details?.phone_number;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "User phone number not found",
      });
    }

    // 4. Send SMS
    const smsSent = await sendOTPViaSMS(phone, "verify");

    if (!smsSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send SMS",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SMS sent successfully to offline user",
      phone,
    });
  } catch (error) {
    console.error("sendSMSNotificationToUser Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const sendOneSignalNotification = async ({
  externalUserId,
  title,
  message,
  data = {},
  androidChannelId,
}) => {
  try {
    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,

      // Target specific device
      include_external_user_ids: [externalUserId],

      headings: { en: title },
      contents: { en: message },

      // ✅ THIS IS THE KEY FIX
      android_channel_id: androidChannelId,

      // App-side logic data (unchanged)
      data,
    };

    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("OneSignal Error:", error.response?.data || error.message);
    throw error;
  }
};

const getAllNotification = async (req, res) => {
  try {
    const { user_id } = req.params;
    let { current_page } = req.query;

    // 🧠 default page = 1
    current_page = parseInt(current_page) || 1;

    const PAGE_SIZE = 20;
    const skip = (current_page - 1) * PAGE_SIZE;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    // 👤 only notifications fetch karo
    const user = await User.findById(user_id).select("notifications");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const notifications = user.notifications || [];

    // 🔔 unseen notifications count
    const unseenCount = notifications.filter(
      (n) => n.seen_status === false
    ).length;

    // ⏰ latest notifications on top
    const sortedNotifications = notifications.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // 📄 pagination logic
    const totalNotifications = sortedNotifications.length;
    const totalPages = Math.ceil(totalNotifications / PAGE_SIZE);

    // ✅ ONLY current page ka data
    const pageData = sortedNotifications.slice(skip, skip + PAGE_SIZE);

    return res.status(200).json({
      status: true,
      message: "Notifications fetched successfully",
      unseen_count: unseenCount,
      pagination: {
        current_page,
        page_size: PAGE_SIZE,
        total_pages: totalPages,
        total_notifications: totalNotifications,
      },
      data: pageData,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const seenNotificationByUser = async (req, res) => {
  try {
    const { user_id, notification_id } = req.body;

    // 🔍 validation
    if (!notification_id) {
      return res.status(400).json({
        status: false,
        message: "notification_id are required",
      });
    }

    // 👤 find user
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 🔔 find notification inside user's notifications array
    const notification = user.notifications.id(notification_id);

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    // ✅ mark as seen
    notification.seen_status = true;

    // 💾 save user document
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Notification marked as seen",
    });
  } catch (error) {
    console.error("Seen notification error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const checkSecurityCode = async (req, res) => {
  try {
    const { user_id, vehicle_id } = req.body;

    // 1️⃣ Validate input
    if (!user_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and vehicle_id are required",
      });
    }

    // 2️⃣ Find user
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3️⃣ Find vehicle inside garage
    const vehicle = user.garage.vehicles.find(
      (v) => v.vehicle_id === vehicle_id
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this user",
      });
    }

    // 4️⃣ Generate 6-digit random security code
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 5️⃣ Save security code in vehicle_doc
    vehicle.vehicle_doc.security_code = securityCode;

    await user.save();

    // 6️⃣ Auto clear after 10 minutes
    setTimeout(async () => {
      try {
        const freshUser = await User.findById(user_id);
        if (!freshUser) return;

        const freshVehicle = freshUser.garage.vehicles.find(
          (v) => v.vehicle_id === vehicle_id
        );

        if (freshVehicle) {
          freshVehicle.vehicle_doc.security_code = "";
          await freshUser.save();
        }
      } catch (err) {
        console.error("Security code auto-clear error:", err);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return res.status(200).json({
      success: true,
      message: "Security code generated successfully",
      security_code: securityCode, // (SMS / frontend me bhejne ke liye)
      expires_in: "10 minutes",
      vehicle_doc_data: vehicle.vehicle_doc.documents,
    });
  } catch (error) {
    console.error("checkSecurityCode Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const verifySecurityCode = async (req, res) => {
  try {
    const { user_id, vehicle_id, security_code } = req.body;

    if (!user_id || !vehicle_id || !security_code) {
      return res.status(400).json({
        success: false,
        message: "user_id, vehicle_id and security_code are required",
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

    // 2️⃣ Find vehicle inside garage
    const vehicle = user.garage.vehicles.find(
      (v) => v.vehicle_id === vehicle_id
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // 3️⃣ Check security code
    if (vehicle.vehicle_doc.security_code !== security_code) {
      return res.status(401).json({
        success: false,
        message: "Invalid security code",
      });
    }

    // 4️⃣ Success → return all documents
    return res.status(200).json({
      success: true,
      message: "Security code verified successfully",
      data: {
        documents: vehicle.vehicle_doc.documents,
      },
    });
  } catch (error) {
    console.error("verifySecurityCode Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const isOnnotification = async (req, res) => {
  try {
    console.log("click");

    const { user_id, is_notification_on } = req.body;

    // ------------------ VALIDATION ------------------
    if (typeof is_notification_on !== "boolean") {
      return res.status(400).json({
        status: false,
        message: "Invalid parameters",
      });
    }

    // ------------------ FIND USER ------------------
    let user;

    if (mongoose.Types.ObjectId.isValid(user_id)) {
      user = await User.findById(user_id);
    } else if (user_id.includes("@")) {
      user = await User.findOne({
        "basic_details.email": user_id.toLowerCase(),
      });
    } else {
      user = await User.findOne({
        "basic_details.phone_number": String(user_id),
      });
    }

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // ------------------ UPDATE BOOLEAN ------------------
    user.is_notification_sound_on = is_notification_on;

    await user.save();

    return res.status(200).json({
      status: true,
      message: `Notification ${
        is_notification_on ? "enabled" : "disabled"
      } successfully`,
      data: {
        is_notification_on: user.is_notification_sound_on,
      },
    });
  } catch (error) {
    console.error("Notification toggle error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const sendOTPViaSMS = async (phone, templateType = "verify") => {
  try {
    // PRP SMS API configuration
    const prpSmsConfig = {
      apiUrl:
        process.env.PRP_SMS_API_URL ||
        "https://api.prpsms.biz/BulkSMSapi/keyApiSendSMS/SendSmsTemplateName",
      apiKey: process.env.PRP_SMS_API_KEY,
      sender: process.env.PRP_SMS_SENDER || "DGVAHN",
      templates: {
        verify: process.env.PRP_SMS_2FA_TEMPLATE_NAME || "2FA_Verification_OTP",
      },
    };

    // Validate configuration
    if (!prpSmsConfig.apiKey || !prpSmsConfig.sender) {
      console.error(
        "PRP SMS configuration missing. Please check environment variables."
      );
      return false;
    }

    // Get template name based on type
    const templateName = prpSmsConfig.templates[templateType];
    if (!templateName) {
      console.error(`Template name not found for type: ${templateType}`);
      return false;
    }

    // Prepare SMS payload for PRP SMS API
    const smsPayload = {
      sender: prpSmsConfig.sender,
      templateName: templateName,
      smsReciever: [
        {
          mobileNo: phone,
        },
      ],
    };

    // Send SMS via PRP SMS API
    const response = await axios.post(prpSmsConfig.apiUrl, smsPayload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: prpSmsConfig.apiKey,
      },
      timeout: 10000, // 10 second timeout
    });

    // Check response status
    if (response.data.isSuccess) {
      console.log(`📱 SMS sent successfully to ${phone} via PRP SMS`);
      console.log(`Response:`, response.data);
      return true;
    } else {
      console.error("PRP SMS API error:", response.data);
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS via PRP SMS:", error.message);
    return false;
  }
};

module.exports = {
  sendNotification,
  sendNotificationForCall,
  sendSMSNotificationToUser,
  getAllNotification,
  checkSecurityCode,
  verifySecurityCode,
  seenNotificationByUser,
  isOnnotification,
};
