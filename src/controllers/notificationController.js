const User         = require("../models/User");
const Notification = require("../models/notification.model");
const Device       = require("../models/Device");
const ChatList     = require("../models/Chat");
const axios        = require("axios");
const mongoose     = require("mongoose");
const { sendFcmNotification } = require("../utils/fcmService");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — safely lookup FCM token for a user
   Returns string token or null.  NEVER throws.
───────────────────────────────────────────────────────────────────────────── */
async function getFcmToken(userId) {
  try {
    const rec = await Device.findOne(
      { user_id: userId, fcm_token: { $exists: true, $ne: "" } },
      { fcm_token: 1 }
    ).sort({ token_updated_at: -1, updatedAt: -1 }).lean();
    if (rec?.fcm_token) return rec.fcm_token;

    const u = await User.findById(userId).select("fcm_token").lean();
    if (u?.fcm_token) return u.fcm_token;

    // Auto-retrieve from OneSignal (ZERO mobile app changes needed!)
    const osKey = (process.env.ONESIGNAL_REST_API_KEY || "").replace(">", "").trim();
    const osAppId = (process.env.ONESIGNAL_APP_ID || "").trim();
    if (osKey && osAppId && userId) {
      const res = await axios.get(
        `https://onesignal.com/api/v1/apps/${osAppId}/users/by/external_id/${userId}`,
        { headers: { Authorization: `Basic ${osKey}` }, timeout: 4000 }
      );
      const pushSub = (res.data?.subscriptions || []).find(
        s => s.enabled && s.token && (s.type === "AndroidPush" || s.type === "iOSPush")
      );
      if (pushSub?.token) {
        console.log(`[FCM] Auto-retrieved live token from OneSignal for user=${userId}`);
        await Device.findOneAndUpdate(
          { user_id: userId, uuid: pushSub.id || "onesignal_device" },
          {
            $set: {
              fcm_token: pushSub.token,
              device_type: pushSub.type === "iOSPush" ? "ios" : "android",
              is_active: true,
              token_updated_at: new Date()
            }
          },
          { upsert: true }
        ).catch(() => {});
        await User.updateOne({ _id: userId }, { $set: { fcm_token: pushSub.token } }).catch(() => {});
        return pushSub.token;
      }
    }

    return null;
  } catch (e) {
    console.warn("[FCM] token lookup:", e.message);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — safely remove a stale FCM token from all device records
───────────────────────────────────────────────────────────────────────────── */
async function removeStaleFcmToken(token) {
  try {
    await Device.updateMany(
      { fcm_token: token },
      { $set: { fcm_token: "", token_updated_at: new Date() } }
    );
  } catch (e) { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — try sending via FCM, returns true on success, false on failure
───────────────────────────────────────────────────────────────────────────── */
async function trySendFcm(opts) {
  const { fcmToken, ...rest } = opts;
  if (!fcmToken) {
    console.log("[Push] No FCM token found, using OneSignal fallback");
    return false;
  }
  try {
    const msgId = await sendFcmNotification({ fcmToken, ...rest });
    console.log("[FCM] Push delivered successfully! Message ID:", msgId);
    return true;
  } catch (err) {
    if (err.isBadToken) {
      console.warn("[FCM] Stale token removed:", fcmToken.slice(0, 20) + "...");
      await removeStaleFcmToken(fcmToken);
    } else {
      console.error("[FCM] Send failed (using OneSignal fallback):", err.message);
    }
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — OneSignal send.  NEVER throws (logs error & returns false).
───────────────────────────────────────────────────────────────────────────── */
async function sendOneSignal({
  externalUserId,
  title,
  body,
  data         = {},
  androidChannelId,
  iosSound     = "default",
  badgeCount   = 1,
  largeIconUrl = "",
  bigPictureUrl= "",
}) {
  try {
    const key = (process.env.ONESIGNAL_REST_API_KEY || "").replace(">", "").trim();
    const payload = {
      app_id:                    process.env.ONESIGNAL_APP_ID.trim(),
      include_external_user_ids: [String(externalUserId)],
      headings:  { en: title },
      contents:  { en: body  },
      android_channel_id: androidChannelId,
      ios_sound:          iosSound,
      ios_badgeType:      "SetTo",
      ios_badgeCount:     badgeCount,
      ttl:                86400,
      data,
      android_visibility: 1,
      priority:           10,
    };
    if (largeIconUrl)  payload.large_icon          = largeIconUrl;
    if (bigPictureUrl) {
      payload.android_big_picture = bigPictureUrl;
      payload.ios_attachments     = { id1: bigPictureUrl };
    }
    const res = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      { headers: { "Content-Type": "application/json", Authorization: `Basic ${key}` } }
    );
    if (res.data?.warnings?.length > 0) {
      console.warn("[OneSignal] Delivery warning:", res.data.warnings);
    }
    if (res.data?.errors?.length > 0) {
      console.warn("[OneSignal] Errors:", res.data.errors);
    }
    const recipients = res.data?.recipients ?? 0;
    console.log(`[OneSignal] Response for user=${externalUserId}: id=${res.data?.id || "none"} recipients=${recipients}`);
    return recipients > 0;
  } catch (err) {
    console.error("[OneSignal] Error:", err.response?.data || err.message);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SOUND / CHANNEL MAPS  (Section 8 of handover)
───────────────────────────────────────────────────────────────────────────── */
// OneSignal android_channel_id = UUID format (what OneSignal API expects)
const ONESIGNAL_CHANNEL_MAP = {
  no_parking:                   "0b251d79-aa58-4410-ac8b-a810849ce1c6",
  congested_parking:            "5fbca66a-703c-459e-bcfa-c3815f25b2bb",
  road_block_alert:             "1f097e17-2009-4dd5-b27e-cb84a52cb7c5",
  blocked_vehicle_alert:        "80a16cd8-e359-43be-8ea5-d31ddfab6338",
  car_lights_windows_left_open: "d13bad07-8593-4603-960e-e140317410db",
  car_horn_alarm_going_on:      "8bd1c0ed-7865-4f41-9f95-81a9b37310b8",
  unknown_issue_alert:          "5bd7c478-55c0-42a7-b87f-472c0013ec1f",
  doc_access:                   "b4258f1b-b16e-4d8b-920f-fdcc394eb79f",
  accident_alert:               "99fdc63d-21f4-42a3-bb3d-5d9c4398c594",
};
const DEFAULT_OS_CHANNEL = "328b98de-49cc-47b2-85b4-733547c953d4";
const CALL_OS_CHANNEL    = "0f86d5a8-1877-4a8a-ad45-d609c14d16bd";

const IOS_SOUND_MAP = {
  no_parking:                   "no_parking.caf",
  congested_parking:            "congested_parking.caf",
  road_block_alert:             "road_block_alert.caf",
  blocked_vehicle_alert:        "blocked_vehicle_alert.caf",
  car_lights_windows_left_open: "car_lights_windows_left_open.caf",
  car_horn_alarm_going_on:      "car_horn_alarm_going_on.caf",
  unknown_issue_alert:          "unknown_issue_alert.caf",
  doc_access:                   "doc_access.caf",
  accident_alert:               "accident_alert.caf",
  sound:                        "sound.caf",
  call_user:                    "call_sound.caf",
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/notifications/send
───────────────────────────────────────────────────────────────────────────── */
const sendNotification = async (req, res) => {
  try {
    let {
      sender_id,
      receiver_id,
      notification_type,
      notification_title,
      link             = "",
      vehicle_id       = null,
      order_id         = null,
      message          = "",
      issue_type       = "",
      chat_room_id     = null,
      latitude         = "",
      longitude        = "",
      incident_proof   = [],
      inapp_notification = true,
      seen_status      = false,
    } = req.body;

    /* ── 1. Validate receiver ─────────────────────────────────────── */
    if (!receiver_id) return res.status(400).json({ status: false, message: "receiver_id is required" });

    const receiver = await User.findById(receiver_id).select("_id is_notification_sound_on notification_count");
    if (!receiver) return res.status(404).json({ status: false, message: "Receiver not found" });

    /* ── 2. Resolve sender ────────────────────────────────────────── */
    sender_id = sender_id || process.env.GUEST_QR_USER_ID;
    const sender = await User.findById(sender_id).select("basic_details.first_name basic_details.last_name basic_details.profile_pic");
    const senderName = sender ? (`${sender.basic_details.first_name || ""} ${sender.basic_details.last_name || ""}`).trim() || "Guest User" : "Guest User";
    const senderPic  = sender?.basic_details?.profile_pic || "";

    /* ── 3. Normalize incident proof ─────────────────────────────── */
    const incidentProofArray = Array.isArray(incident_proof) ? incident_proof : incident_proof ? [incident_proof] : [];

    /* ── 4. Save notification to DB ──────────────────────────────── */
    const dbNotif = await Notification.create({
      sender_id, receiver_id, sender_pic: senderPic, sender_name: senderName,
      notification_type, notification_title, message, link, vehicle_id, order_id,
      issue_type, chat_room_id, latitude, longitude,
      incident_proof: incidentProofArray, inapp_notification, seen_status,
    });

    /* ── 5. Increment notification count ─────────────────────────── */
    const updatedUser = await User.findOneAndUpdate(
      { _id: receiver_id },
      { $inc: { notification_count: 1 } },
      { new: true }
    );

    /* ── 6. Resolve sound/channel ────────────────────────────────── */
    const soundOn        = receiver.is_notification_sound_on !== false;
    const osChannelId    = soundOn ? (ONESIGNAL_CHANNEL_MAP[issue_type] || DEFAULT_OS_CHANNEL) : DEFAULT_OS_CHANNEL;
    const iosSoundFile   = soundOn ? (IOS_SOUND_MAP[issue_type] || "default") : "default";
    const notifBody      = vehicle_id ? `${message} (Vehicle: ${vehicle_id.toUpperCase()})` : message;
    const badgeCount     = updatedUser?.notification_count || 1;
    const sharedData     = {
      sender_id:         String(sender_id || ""),
      notification_type: String(notification_type || ""),
      order_id:          String(order_id || ""),
      vehicle_id:        String(vehicle_id || ""),
      chat_room_id:      String(chat_room_id || ""),
      issue_type:        String(issue_type || ""),
      latitude:          String(latitude || ""),
      longitude:         String(longitude || ""),
    };

    /* ── 7. Send push notification ───────────────────────────────── */
    // Send FCM first (guaranteed delivery), then also try OneSignal (for custom sound)
    const fcmToken = await getFcmToken(receiver_id);
    const fcmSent  = await trySendFcm({
      fcmToken,
      title:             notification_title,
      body:              notifBody,
      issue_type:        issue_type || "",
      notification_type: notification_type || "",
      vehicle_id:        vehicle_id || "",
      chat_room_id:      chat_room_id || "",
      sender_id:         sender_id || "",
      order_id:          order_id || "",
      latitude:          latitude || "",
      longitude:         longitude || "",
      soundEnabled:      soundOn,
      badgeCount,
      highPriority:      true,
    });

    // Also send via OneSignal (handles custom sound correctly)
    await sendOneSignal({
      externalUserId: receiver_id.toString(),
      title:          notification_title,
      body:           notifBody,
      data:           sharedData,
      androidChannelId: osChannelId,
      iosSound:       iosSoundFile,
      badgeCount,
      largeIconUrl:   incidentProofArray[0] || "",
      bigPictureUrl:  incidentProofArray[0] || "",
    });

    return res.status(201).json({ status: true, message: "Notification sent successfully", data: dbNotif });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/notifications/call
───────────────────────────────────────────────────────────────────────────── */
const sendNotificationForCall = async (req, res) => {
  try {
    const { sender_id, receiver_id } = req.body;

    if (!receiver_id) return res.status(400).json({ status: false, message: "receiver_id is required" });
    if (!mongoose.Types.ObjectId.isValid(receiver_id)) return res.status(400).json({ status: false, message: "Invalid receiver_id" });
    if (sender_id && !mongoose.Types.ObjectId.isValid(sender_id)) return res.status(400).json({ status: false, message: "Invalid sender_id" });

    const [sender, receiver] = await Promise.all([
      sender_id ? User.findById(sender_id).select("basic_details.first_name basic_details.last_name") : null,
      User.findById(receiver_id).select("_id notification_count"),
    ]);

    if (!receiver) return res.status(404).json({ status: false, message: "Receiver not found" });

    const senderName = sender ? (`${sender.basic_details.first_name || ""} ${sender.basic_details.last_name || ""}`).trim() || "Unknown User" : "Unknown User";
    const callBody   = "Incoming call request";

    const osSent = await sendOneSignal({
      externalUserId:  receiver._id.toString(),
      title:           senderName,
      body:            callBody,
      data:            { sender_id: sender_id || "", type: "call" },
      androidChannelId: CALL_OS_CHANNEL,
      iosSound:        "call_sound.caf",
      badgeCount:      receiver.notification_count || 1,
    });

    if (!osSent) {
      const fcmToken = await getFcmToken(receiver_id);
      await trySendFcm({
        fcmToken,
        title:             senderName,
        body:              callBody,
        issue_type:        "call_user",
        notification_type: "call",
        sender_id:         sender_id || "",
        soundEnabled:      true,
        badgeCount:        receiver.notification_count || 1,
        highPriority:      true,
      });
    }

    return res.status(200).json({ status: true, message: "Call notification sent successfully" });
  } catch (error) {
    console.error("sendNotificationForCall error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/notifications/:user_id
───────────────────────────────────────────────────────────────────────────── */
const getAllNotification = async (req, res) => {
  try {
    const { user_id } = req.params;
    let { current_page = 1 } = req.query;
    current_page = parseInt(current_page) || 1;
    const PAGE_SIZE = 20;
    const skip      = (current_page - 1) * PAGE_SIZE;

    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ status: false, message: "Invalid user_id" });
    const receiverObjectId = new mongoose.Types.ObjectId(user_id);

    const notifications = await Notification.find({ receiver_id: receiverObjectId })
      .sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean();

    const [totalNotifications, unseenCount] = await Promise.all([
      Notification.countDocuments({ receiver_id: receiverObjectId }),
      Notification.countDocuments({ receiver_id: receiverObjectId, seen_status: false }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Notifications fetched successfully",
      unseen_count: unseenCount,
      pagination: { current_page, page_size: PAGE_SIZE, total_pages: Math.ceil(totalNotifications / PAGE_SIZE), total_notifications: totalNotifications },
      data: notifications,
    });
  } catch (error) {
    console.error("getAllNotification error:", error);
    return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/notifications/seen
───────────────────────────────────────────────────────────────────────────── */
const seenNotificationByUser = async (req, res) => {
  try {
    const { user_id, notification_id } = req.body;
    if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(notification_id)) {
      return res.status(400).json({ status: false, message: "Valid user_id and notification_id required" });
    }
    const updatedNotification = await Notification.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(notification_id), receiver_id: new mongoose.Types.ObjectId(user_id) },
      { $set: { seen_status: true, seen_at: new Date() } },
      { new: true }
    );
    if (!updatedNotification) return res.status(404).json({ status: false, message: "Notification not found for this user" });
    return res.status(200).json({ status: true, message: "Notification marked as seen", data: { notification_id: updatedNotification._id, seen_status: updatedNotification.seen_status, seen_at: updatedNotification.seen_at } });
  } catch (error) {
    console.error("seenNotificationByUser error:", error);
    return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/notifications/toggle-sound
───────────────────────────────────────────────────────────────────────────── */
const isOnnotification = async (req, res) => {
  try {
    const { user_id, is_notification_on } = req.body;
    if (typeof is_notification_on !== "boolean" || !user_id) return res.status(400).json({ status: false, message: "Invalid parameters" });

    let query;
    if (mongoose.Types.ObjectId.isValid(user_id))    query = { _id: user_id };
    else if (user_id.includes("@"))                  query = { "basic_details.email": user_id.toLowerCase().trim() };
    else                                             query = { "basic_details.phone_number": String(user_id).trim() };

    const updatedUser = await User.findOneAndUpdate(
      query,
      { $set: { is_notification_sound_on: is_notification_on } },
      { new: true, projection: { is_notification_sound_on: 1 } }
    ).lean();

    if (!updatedUser) return res.status(404).json({ status: false, message: "User not found" });
    return res.status(200).json({ status: true, message: `Notification ${is_notification_on ? "enabled" : "disabled"} successfully`, data: { is_notification_on: updatedUser.is_notification_sound_on } });
  } catch (error) {
    console.error("isOnnotification error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/notifications
───────────────────────────────────────────────────────────────────────────── */
const DeleteNotification = async (req, res) => {
  try {
    const { user_id, notification_id, chat_room_id } = req.body;
    if (!user_id || !notification_id) return res.status(400).json({ success: false, message: "user_id and notification_id are required" });
    if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(notification_id)) return res.status(400).json({ success: false, message: "Invalid ID format" });

    const deletedNotification = await Notification.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(notification_id),
      receiver_id: new mongoose.Types.ObjectId(user_id),
    });
    if (!deletedNotification) return res.status(404).json({ success: false, message: "Notification not found for this user" });

    await User.updateOne({ _id: new mongoose.Types.ObjectId(user_id) }, { $inc: { notification_count: -1 } });

    if (chat_room_id && mongoose.Types.ObjectId.isValid(chat_room_id)) {
      await ChatList.deleteMany({ chat_room_id: new mongoose.Types.ObjectId(chat_room_id) });
    }

    return res.status(200).json({ success: true, message: "Notification deleted successfully", data: { notification_id, chat_room_id: chat_room_id || null } });
  } catch (error) {
    console.error("DeleteNotification error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
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
