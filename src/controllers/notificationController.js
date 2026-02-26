const User = require("../models/User");
const Notification = require("../models/notification.model");
const ChatList = require("../models/Chat");
const axios = require("axios");
const mongoose = require("mongoose");

const sendNotification = async (req, res) => {
  try {
    let {
      sender_id,
      receiver_id,
      notification_type,
      notification_title,
      link = "",
      vehicle_id = null,
      order_id = null,
      message = "",
      issue_type = "",
      chat_room_id = null,
      latitude = "",
      longitude = "",
      incident_proof = [],
      inapp_notification = true,
      seen_status = false,
    } = req.body;

    const GUEST_ID = process.env.GUEST_QR_USER_ID;

    /* ===============================
       1️⃣ VALIDATE RECEIVER
    =============================== */

    if (!receiver_id) {
      return res.status(400).json({
        status: false,
        message: "receiver_id is required",
      });
    }

    const receiver = await User.findById(receiver_id).select(
      "_id is_notification_sound_on",
    );

    if (!receiver) {
      return res.status(404).json({
        status: false,
        message: "Receiver not found",
      });
    }

    /* ===============================
       2️⃣ RESOLVE SENDER
    =============================== */

    sender_id = sender_id || GUEST_ID;

    const sender = await User.findById(sender_id).select(
      "basic_details.first_name basic_details.last_name basic_details.profile_pic",
    );

    const senderName = sender
      ? `${sender.basic_details.first_name || ""} ${
          sender.basic_details.last_name || ""
        }`.trim() || "Guest User"
      : "Guest User";

    const senderPic = sender?.basic_details?.profile_pic || "";

    /* ===============================
       3️⃣ NORMALIZE INCIDENT PROOF
    =============================== */

    const incidentProofArray = Array.isArray(incident_proof)
      ? incident_proof
      : incident_proof
        ? [incident_proof]
        : [];

    /* ===============================
       4️⃣ CREATE NOTIFICATION OBJECT
    =============================== */

    const response = await Notification.create({
      sender_id,
      receiver_id,
      sender_pic: senderPic,
      sender_name: senderName,
      notification_type,
      notification_title,
      message,
      link,
      vehicle_id,
      order_id,
      issue_type,
      chat_room_id,
      latitude,
      longitude,
      incident_proof: incidentProofArray,
      inapp_notification,
      seen_status,
    });

    await User.updateOne(
      { _id: receiver_id },
      { $inc: { notification_count: 1 } },
    );

    /* ===============================
       6️⃣ ANDROID CHANNEL LOGIC
    =============================== */

    const CHANNEL_MAP = {
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

    const DEFAULT_CHANNEL = "328b98de-49cc-47b2-85b4-733547c953d4";

    const androidChannelId = receiver.is_notification_sound_on
      ? CHANNEL_MAP[issue_type] || DEFAULT_CHANNEL
      : DEFAULT_CHANNEL;

    /* ===============================
       7️⃣ SEND PUSH NOTIFICATION
    =============================== */

    await sendOneSignalNotification({
      externalUserId: receiver_id.toString(),
      title: notification_title,
      message,
      data: {
        sender_id,
        notification_type,
        order_id: order_id || "",
        vehicle_id: vehicle_id || "",
        chat_room_id: chat_room_id || "",
        issue_type: issue_type || "",
        latitude,
        longitude,
      },
      androidChannelId,
      largeIconUrl: incidentProofArray[0],
      bigPictureUrl: incidentProofArray[0],
    });

    /* ===============================
       8️⃣ SUCCESS RESPONSE
    =============================== */

    return res.status(201).json({
      status: true,
      message: "Notification sent successfully",
      data: response,
    });
  } catch (error) {
    console.error("Send notification error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const sendNotificationForCall = async (req, res) => {
  try {
    const { sender_id, receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({
        status: false,
        message: "receiver_id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiver_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid receiver_id",
      });
    }

    if (sender_id && !mongoose.Types.ObjectId.isValid(sender_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid sender_id",
      });
    }

    // 🔥 Fetch sender & receiver in parallel (faster)
    const [sender, receiver] = await Promise.all([
      sender_id
        ? User.findById(sender_id).select(
            "basic_details.first_name basic_details.last_name",
          )
        : null,
      User.findById(receiver_id).select("_id is_notification_sound_on"),
    ]);

    if (!receiver) {
      return res.status(404).json({
        status: false,
        message: "Receiver not found",
      });
    }

    let senderName = "Unknown User";

    if (sender) {
      senderName = `${sender.basic_details.first_name || ""} ${
        sender.basic_details.last_name || ""
      }`.trim();
    }

    const message = "Incoming call request";

    const androidChannelId = "0f86d5a8-1877-4a8a-ad45-d609c14d16bd";

    // 🔥 Send push (non-blocking safe pattern)
    await sendOneSignalNotification({
      externalUserId: receiver._id.toString(),
      title: senderName,
      message,
      data: {
        sender_id: sender_id || "",
        type: "call",
      },
      androidChannelId,
    });

    return res.status(200).json({
      status: true,
      message: "Call notification sent successfully",
    });
  } catch (error) {
    console.error("Send call notification error:", error);
    return res.status(500).json({
      status: false,
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
  largeIconUrl = "",
  bigPictureUrl = "",
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

      large_icon: largeIconUrl,
      android_big_picture: bigPictureUrl,

      android_visibility: 1,
      priority: 10,
    };

    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
      },
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
    let { current_page = 1 } = req.query;

    current_page = parseInt(current_page) || 1;

    const PAGE_SIZE = 20;
    const skip = (current_page - 1) * PAGE_SIZE;

    // Validate user_id
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user_id",
      });
    }

    const receiverObjectId = new mongoose.Types.ObjectId(user_id);

    /* ===============================
       1️⃣ Fetch notifications
    =============================== */

    const notifications = await Notification.find({
      receiver_id: receiverObjectId,
    })
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(PAGE_SIZE)
      .lean();

    /* ===============================
       2️⃣ Get total & unseen count
    =============================== */

    const [totalNotifications, unseenCount] = await Promise.all([
      Notification.countDocuments({
        receiver_id: receiverObjectId,
      }),

      Notification.countDocuments({
        receiver_id: receiverObjectId,
        seen_status: false,
      }),
    ]);

    const totalPages = Math.ceil(totalNotifications / PAGE_SIZE);

    /* ===============================
       3️⃣ Response
    =============================== */

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

      data: notifications,
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

    // 1️⃣ Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(notification_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Valid user_id and notification_id required",
      });
    }

    const receiverObjectId = new mongoose.Types.ObjectId(user_id);
    const notificationObjectId = new mongoose.Types.ObjectId(notification_id);

    // 2️⃣ Atomic update directly in Notification collection
    const updatedNotification = await Notification.findOneAndUpdate(
      {
        _id: notificationObjectId,
        receiver_id: receiverObjectId,
      },
      {
        $set: {
          seen_status: true,
          seen_at: new Date(),
        },
      },
      {
        new: true, // return updated document
      },
    );

    // 3️⃣ If not found
    if (!updatedNotification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found for this user",
      });
    }

    // 4️⃣ Success response
    return res.status(200).json({
      status: true,
      message: "Notification marked as seen",
      data: {
        notification_id: updatedNotification._id,
        seen_status: updatedNotification.seen_status,
        seen_at: updatedNotification.seen_at,
      },
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

const isOnnotification = async (req, res) => {
  try {
    const { user_id, is_notification_on } = req.body;

    // ✅ Validation
    if (typeof is_notification_on !== "boolean" || !user_id) {
      return res.status(400).json({
        status: false,
        message: "Invalid parameters",
      });
    }

    // ✅ Build query (NO multiple DB calls)
    let query;

    if (mongoose.Types.ObjectId.isValid(user_id)) {
      query = { _id: user_id };
    } else if (user_id.includes("@")) {
      query = { "basic_details.email": user_id.toLowerCase().trim() };
    } else {
      query = { "basic_details.phone_number": String(user_id).trim() };
    }

    // ✅ Atomic update (FASTEST METHOD)
    const updatedUser = await User.findOneAndUpdate(
      query,
      {
        $set: {
          is_notification_sound_on: is_notification_on,
        },
      },
      {
        new: true,
        projection: {
          is_notification_sound_on: 1,
        },
      },
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: `Notification ${
        is_notification_on ? "enabled" : "disabled"
      } successfully`,
      data: {
        is_notification_on: updatedUser.is_notification_sound_on,
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

const DeleteNotification = async (req, res) => {
  try {
    const { user_id, notification_id, chat_room_id } = req.body;

    /* ===============================
       1️⃣ Validate input
    =============================== */

    if (!user_id || !notification_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and notification_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(notification_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const receiverObjectId = new mongoose.Types.ObjectId(user_id);
    const notificationObjectId = new mongoose.Types.ObjectId(notification_id);

    /* ===============================
       2️⃣ Find and delete notification
    =============================== */

    const deletedNotification = await Notification.findOneAndDelete({
      _id: notificationObjectId,
      receiver_id: receiverObjectId,
    });

    if (!deletedNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found for this user",
      });
    }

    /* ===============================
       3️⃣ Decrease notification count
    =============================== */

    await User.updateOne(
      { _id: receiverObjectId },
      {
        $inc: { notification_count: -1 },
      },
    );

    /* ===============================
       4️⃣ Delete chat messages if exists
    =============================== */

    if (chat_room_id && mongoose.Types.ObjectId.isValid(chat_room_id)) {
      await ChatList.deleteMany({
        chat_room_id: new mongoose.Types.ObjectId(chat_room_id),
      });
    }

    /* ===============================
       5️⃣ Success response
    =============================== */

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: {
        notification_id,
        chat_room_id: chat_room_id || null,
      },
    });
  } catch (error) {
    console.error("DeleteNotification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  sendNotification,
  sendNotificationForCall,
  getAllNotification,
  DeleteNotification,
  seenNotificationByUser,
  isOnnotification,
};
