const User = require("../models/User");
const Notification = require("../models/notification.model");
const ChatList = require("../models/Chat");
const axios = require("axios");
const mongoose = require("mongoose");

/* ================================================
   iOS NOTIFICATION CONTROLLER
   — Exact same as notificationController.js
   — Extra: iOS sound logic + apns_push_type_override
   — Old file is NOT touched
================================================ */

const sendIosNotification = async (req, res) => {
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
      "_id is_notification_sound_on notification_count",
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
      ? `${sender.basic_details.first_name || ""} ${sender.basic_details.last_name || ""}`.trim() || "Guest User"
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

    const updatedUser = await User.findOneAndUpdate(
      { _id: receiver_id },
      { $inc: { notification_count: 1 } },
      { new: true }
    );

    /* ===============================
       5️⃣ ANDROID CHANNEL LOGIC
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
       6️⃣ iOS SOUND LOGIC
       Android me Channel ID se alag-alag sound/behaviour control hota hai.
       iOS me Channel ID ka concept nahi hai — sirf sound file ka naam bhejna hota hai.
       IOS_SOUND_MAP Android ke CHANNEL_MAP ka iOS equivalent hai.
    =============================== */

    const IOS_SOUND_MAP = {
      no_parking: "no_parking.caf",
      congested_parking: "congested_parking.caf",
      road_block_alert: "road_block_alert.caf",
      blocked_vehicle_alert: "blocked_vehicle_alert.caf",
      car_lights_windows_left_open: "car_lights_windows_left_open.caf",
      car_horn_alarm_going_on: "car_horn_alarm_going_on.caf",
      unknown_issue_alert: "unknown_issue_alert.caf",
      doc_access: "doc_access.caf",
      accident_alert: "accident_alert.caf",
    };

    const DEFAULT_IOS_SOUND = "default"; // iOS system default sound

    // Same logic as Android: agar notification sound ON hai to custom sound, warna default
    const iosSound = receiver.is_notification_sound_on
      ? IOS_SOUND_MAP[issue_type] || DEFAULT_IOS_SOUND
      : DEFAULT_IOS_SOUND;

    /* ===============================
       7️⃣ SEND PUSH NOTIFICATION (iOS)
    =============================== */

    // 🔥 Send push notification (non-blocking — agar push fail ho toh bhi notification save ho)
    try {
      await sendIosOneSignalNotification({
        externalUserId: receiver_id.toString(),
        title: notification_title,
        message: vehicle_id ? `${message} (Vehicle: ${vehicle_id.toUpperCase()})` : message,
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
        iosSound,
        iosBadgeCount: updatedUser.notification_count,
        largeIconUrl: incidentProofArray[0],
        bigPictureUrl: incidentProofArray[0],
      });
    } catch (pushError) {
      // Push fail hone par bhi in-app notification save ho chuki hai — sirf log karo
      console.error("iOS OneSignal push failed (non-fatal):", pushError?.response?.data || pushError?.message);
    }

    /* ===============================
       8️⃣ SUCCESS RESPONSE
    =============================== */

    return res.status(201).json({
      status: true,
      message: "iOS Notification sent successfully",
      data: response,
    });
  } catch (error) {
    console.error("Send iOS notification error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/* ================================================
   iOS OneSignal Sender
   — Android ke CHANNEL_MAP + iOS ke ios_sound +
     apns_push_type_override: "alert" — dono handle karta hai
================================================ */

const sendIosOneSignalNotification = async ({
  externalUserId,
  title,
  message,
  data = {},
  androidChannelId,
  iosSound = "default",
  iosBadgeCount = 1,
  largeIconUrl = "",
  bigPictureUrl = "",
}) => {
  try {
    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID.trim(),

      // Target specific device
      include_external_user_ids: [externalUserId],

      headings: { en: title },
      contents: { en: message },

      // ─── Android Channel ─────────────────────────────
      android_channel_id: androidChannelId,

      // ─── iOS Sound ───────────────────────────────────
      ios_sound: iosSound,

      // ─── iOS Badge ───────────────────────────────────
      ios_badgeType: "SetTo",
      ios_badgeCount: iosBadgeCount,

      // Ensures iOS treats this as a visible alert notification (not silent)
      apns_push_type_override: "alert",

      // ─── Delivery TTL ────────────────────────────────
      // 86400 = 24 hours — agar device offline ho to bhi deliver hoga
      ttl: 86400,

      // App-side data (same as Android)
      data,

      android_visibility: 1,
      priority: 10,
    };

    // Only add image fields if they have valid values
    if (largeIconUrl) {
      payload.large_icon = largeIconUrl;
    }
    if (bigPictureUrl) {
      payload.android_big_picture = bigPictureUrl;
      payload.ios_attachments = { id1: bigPictureUrl }; // iOS rich notification image
    }

    console.log("OS Key is loaded:", !!process.env.ONESIGNAL_REST_API_KEY);
    
    const response = await axios.post("https://onesignal.com/api/v1/notifications", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY.replace('>', '').trim()}`,
      },
    });

    console.log("[iOS OneSignal] Response:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("iOS OneSignal Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendIosNotification,
};
