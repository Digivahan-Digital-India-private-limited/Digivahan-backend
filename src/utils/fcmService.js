/**
 * FCM HTTP v1 Service — DigiVahan
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises Firebase via service-account JSON and exposes sendFcmNotification().
 *
 * Set FCM_SERVICE_ACCOUNT_PATH in .env to the absolute or relative path of the
 * downloaded serviceAccountKey.json (keep it OUTSIDE the web-root and git-ignored).
 * Set FCM_PROJECT_ID=digivahan-94702 in .env.
 *
 * No heavy Firebase Admin SDK needed – we sign our own JWTs and cache the
 * short-lived Google OAuth 2.0 access-token for 55 minutes.
 */

"use strict";

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
const axios  = require("axios");

// ─── Sound + Channel maps (Aligned with mobile app's OneSignal Channels) ───

const ONESIGNAL_RAW_CHANNELS = {
  no_parking:                   "0b251d79-aa58-4410-ac8b-a810849ce1c6",
  congested_parking:            "5fbca66a-703c-459e-bcfa-c3815f25b2bb",
  road_block_alert:             "1f097e17-2009-4dd5-b27e-cb84a52cb7c5",
  blocked_vehicle_alert:        "80a16cd8-e359-43be-8ea5-d31ddfab6338",
  car_lights_windows_left_open: "d13bad07-8593-4603-960e-e140317410db",
  car_horn_alarm_going_on:      "8bd1c0ed-7865-4f41-9f95-81a9b37310b8",
  unknown_issue_alert:          "5bd7c478-55c0-42a7-b87f-472c0013ec1f",
  doc_access:                   "b4258f1b-b16e-4d8b-920f-fdcc394eb79f",
  accident_alert:               "99fdc63d-21f4-42a3-bb3d-5d9c4398c594",
  call_user:                    "0f86d5a8-1877-4a8a-ad45-d609c14d16bd",
  default:                      "328b98de-49cc-47b2-85b4-733547c953d4",
};

// Channel IDs registered in the mobile app — SIMPLE STRING NAMES (from handover doc Section 8)
// The mobile app registers NotificationChannels with these exact IDs + matching raw sound files
const ANDROID_CHANNEL_MAP = {
  no_parking:                   "no_parking",
  congested_parking:            "congested_parking",
  road_block_alert:             "road_block_alert",
  blocked_vehicle_alert:        "blocked_vehicle_alert",
  car_lights_windows_left_open: "car_lights_windows_left_open",
  car_horn_alarm_going_on:      "car_horn_alarm_going_on",
  unknown_issue_alert:          "unknown_issue_alert",
  doc_access:                   "doc_access",
  accident_alert:               "accident_alert",
  call_user:                    "call_user",
  sound:                        "sound",
};

const ANDROID_SOUND_MAP = {
  no_parking:                   "no_parking",
  congested_parking:            "congested_parking",
  road_block_alert:             "road_block_alert",
  blocked_vehicle_alert:        "blocked_vehicle_alert",
  car_lights_windows_left_open: "car_lights_windows_left_open",
  unknown_issue_alert:          "unknown_issue_alert",
  doc_access:                   "doc_access",
  accident_alert:               "accident_alert",
  car_horn_alarm_going_on:      "car_horn_alarm_going_on",
  sound:                        "sound",
  call_user:                    "call_sound",
};

const IOS_SOUND_MAP = {
  no_parking:                   "no_parking.caf",
  congested_parking:            "congested_parking.caf",
  road_block_alert:             "road_block_alert.caf",
  blocked_vehicle_alert:        "blocked_vehicle_alert.caf",
  car_lights_windows_left_open: "car_lights_windows_left_open.caf",
  unknown_issue_alert:          "unknown_issue_alert.caf",
  doc_access:                   "doc_access.caf",
  accident_alert:               "accident_alert.caf",
  car_horn_alarm_going_on:      "car_horn_alarm_going_on.caf",
  sound:                        "sound.caf",
  call_user:                    "call_sound.caf",
};

const DEFAULT_ANDROID_CHANNEL = "sound"; // default channel registered in app
const DEFAULT_IOS_SOUND       = "default";
const FCM_BASE                = "https://fcm.googleapis.com/v1/projects";
const OAUTH_URL               = "https://oauth2.googleapis.com/token";
const FCM_SCOPE               = "https://www.googleapis.com/auth/firebase.messaging";

// ─── Token cache ─────────────────────────────────────────────────────────────

let _cachedToken  = null;
let _tokenExpiry  = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadServiceAccount() {
  // 1. Bundled credentials (hardcoded in code, ZERO .env changes needed on live server!)
  try {
    const bundled = require("../config/firebaseCredentials.js");
    if (bundled && bundled.project_id && bundled.private_key) {
      return bundled;
    }
  } catch (err) {
    // ignore
  }

  // 2. Explicit path in env variable (fallback)
  if (process.env.FCM_SERVICE_ACCOUNT_PATH) {
    const saPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
    const abs = path.isAbsolute(saPath) ? saPath : path.join(process.cwd(), saPath);
    if (fs.existsSync(abs)) {
      return JSON.parse(fs.readFileSync(abs, "utf8"));
    }
  }

  // 3. Check serviceAccountKey.json in project root
  const rootKey = path.join(__dirname, "../../serviceAccountKey.json");
  if (fs.existsSync(rootKey)) {
    return JSON.parse(fs.readFileSync(rootKey, "utf8"));
  }

  throw new Error(
    "[FCM] Firebase service-account credentials could not be loaded."
  );
}

function b64url(str) {
  return Buffer.from(str).toString("base64url");
}

function makeJWT(sa) {
  const now   = Math.floor(Date.now() / 1000);
  const hdr   = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss:   sa.client_email,
      scope: FCM_SCOPE,
      aud:   OAUTH_URL,
      iat:   now,
      exp:   now + 3600,
    })
  );
  const unsigned  = `${hdr}.${claim}`;
  const sign      = crypto.createSign("SHA256");
  sign.update(unsigned);
  sign.end();
  const sig = sign.sign(sa.private_key, "base64url");
  return `${unsigned}.${sig}`;
}

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const sa  = loadServiceAccount();
  const jwt = makeJWT(sa);
  const res = await axios.post(
    OAUTH_URL,
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  _cachedToken = res.data.access_token;
  _tokenExpiry = Date.now() + 55 * 60 * 1000;
  return _cachedToken;
}

// ─── FCM error code → bad-token detection ────────────────────────────────────

const BAD_TOKEN_CODES = [
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "registration-token-not-registered",
  "invalid-registration-token",
];

function isBadTokenError(err) {
  const detail   = err.response?.data?.error?.details?.[0]?.errorCode || "";
  const status   = err.response?.data?.error?.status || "";
  const message  = err.response?.data?.error?.message || "";
  return BAD_TOKEN_CODES.some(
    (c) => detail.includes(c) || status.includes(c) || message.includes(c)
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Send a notification via FCM HTTP v1.
 *
 * @param {object}  opts
 * @param {string}  opts.fcmToken
 * @param {string}  opts.title
 * @param {string}  opts.body
 * @param {string}  [opts.issue_type]
 * @param {string}  [opts.notification_type]
 * @param {string}  [opts.vehicle_id]
 * @param {string}  [opts.chat_room_id]
 * @param {string}  [opts.sender_id]
 * @param {string}  [opts.order_id]
 * @param {string}  [opts.latitude]
 * @param {string}  [opts.longitude]
 * @param {boolean} [opts.soundEnabled=true]
 * @param {number}  [opts.badgeCount=1]
 * @param {boolean} [opts.highPriority=true]
 *
 * @returns {Promise<string>} FCM message name/ID
 * @throws  {Error & {isBadToken:true}} for invalid/unregistered tokens
 */
async function sendFcmNotification(opts) {
  const {
    fcmToken,
    title,
    body,
    issue_type        = "",
    notification_type = "",
    vehicle_id        = "",
    chat_room_id      = "",
    sender_id         = "",
    order_id          = "",
    latitude          = "",
    longitude         = "",
    soundEnabled      = true,
    badgeCount        = 1,
    highPriority      = true,
  } = opts;

  if (!fcmToken) throw new Error("[FCM] fcmToken is required");

  const sa          = loadServiceAccount();
  const projectId   = sa.project_id || process.env.FCM_PROJECT_ID || "digivahan-94702";
  const accessToken = await getAccessToken();

  // Normalize issue_type (e.g. "no_parking", "No Parking", "no-parking")
  const normIssue = String(issue_type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const isSoundOn = soundEnabled !== false;

  const androidChannel = isSoundOn
    ? (ANDROID_CHANNEL_MAP[normIssue] || ANDROID_CHANNEL_MAP[issue_type] || DEFAULT_ANDROID_CHANNEL)
    : DEFAULT_ANDROID_CHANNEL;

  const androidSound = isSoundOn
    ? (ANDROID_SOUND_MAP[normIssue] || ANDROID_SOUND_MAP[issue_type] || "default")
    : "default";

  const iosSound = isSoundOn
    ? (IOS_SOUND_MAP[normIssue] || IOS_SOUND_MAP[issue_type] || DEFAULT_IOS_SOUND)
    : DEFAULT_IOS_SOUND;

  // ─── OneSignal UUID channel map (for SDK interception) ──────────────────
  // The OneSignal SDK in the app intercepts FCM data messages that contain
  // OneSignal-format fields. We piggyback on this to get custom sounds without
  // any app code changes. The SDK uses android_channel_id (UUID) which it
  // already created with the correct custom sound.
  const OS_CHANNEL_UUIDS = {
    no_parking:                   "0b251d79-aa58-4410-ac8b-a810849ce1c6",
    congested_parking:            "5fbca66a-703c-459e-bcfa-c3815f25b2bb",
    road_block_alert:             "1f097e17-2009-4dd5-b27e-cb84a52cb7c5",
    blocked_vehicle_alert:        "80a16cd8-e359-43be-8ea5-d31ddfab6338",
    car_lights_windows_left_open: "d13bad07-8593-4603-960e-e140317410db",
    car_horn_alarm_going_on:      "8bd1c0ed-7865-4f41-9f95-81a9b37310b8",
    unknown_issue_alert:          "5bd7c478-55c0-42a7-b87f-472c0013ec1f",
    doc_access:                   "b4258f1b-b16e-4d8b-920f-fdcc394eb79f",
    accident_alert:               "99fdc63d-21f4-42a3-bb3d-5d9c4398c594",
    call_user:                    "0f86d5a8-1877-4a8a-ad45-d609c14d16bd",
    sound:                        "328b98de-49cc-47b2-85b4-733547c953d4",
  };

  const osChannelUuid = isSoundOn
    ? (OS_CHANNEL_UUIDS[normIssue] || OS_CHANNEL_UUIDS[issue_type] || OS_CHANNEL_UUIDS.sound)
    : OS_CHANNEL_UUIDS.sound;

  // Unique notification ID for deduplication
  const notifId = `dv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // All FCM data-payload values must be strings (per handover Section 9)
  const data = {
    // Required routing fields
    notification_type:  String(notification_type || ""),
    issue_type:         String(issue_type || normIssue || ""),
    vehicle_id:         String(vehicle_id || ""),
    chat_room_id:       String(chat_room_id || ""),
    sender_id:          String(sender_id || ""),
    order_id:           String(order_id || ""),
    latitude:           String(latitude || ""),
    longitude:          String(longitude || ""),
    badge:              String(badgeCount),
    // Audio / Channel fields
    channel_id:         androidChannel,
    sound:              androidSound,
    sound_name:         androidSound,
    ios_sound:          iosSound,
    // Interop fields
    custom:             JSON.stringify({ i: notifId }),
    title:              String(title || ""),
    alert:              String(body || ""),
    android_channel_id: osChannelUuid,
    pri:                "1",
  };

  const message = {
    token: fcmToken,
    notification: { title, body },
    data,
    android: {
      priority: highPriority ? "HIGH" : "NORMAL",
      notification: {
        channel_id:              androidChannel,
        sound:                   androidSound,
        notification_priority:   highPriority ? "PRIORITY_MAX" : "PRIORITY_HIGH",
        visibility:              "PUBLIC",
        click_action:            "FLUTTER_NOTIFICATION_CLICK",
        default_sound:           !isSoundOn,
        default_vibrate_timings: true,
      },
    },
    apns: {
      headers: {
        "apns-priority":  highPriority ? "10" : "5",
        "apns-push-type": "alert",
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: isSoundOn ? iosSound : "default",
          badge: badgeCount,
          "content-available": 1,
          "mutable-content":   1,
        },
      },
    },
  };

  try {
    const url = `${FCM_BASE}/${projectId}/messages:send`;
    const res = await axios.post(
      url,
      { message },
      {
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data?.name || "sent";
  } catch (err) {
    if (isBadTokenError(err)) {
      const badErr       = new Error(`[FCM] Invalid/unregistered token`);
      badErr.isBadToken  = true;
      badErr.fcmError    = err.response?.data?.error;
      throw badErr;
    }
    // On auth errors, clear cache so next call re-fetches
    if (err.response?.status === 401) {
      _cachedToken = null;
      _tokenExpiry = 0;
    }
    throw err;
  }
}

function isFcmConfigured() {
  try {
    const sa = loadServiceAccount();
    return !!(sa && sa.project_id && sa.private_key);
  } catch (err) {
    return false;
  }
}

module.exports = {
  sendFcmNotification,
  isFcmConfigured,
  ANDROID_CHANNEL_MAP,
  ANDROID_SOUND_MAP,
  IOS_SOUND_MAP,
};
