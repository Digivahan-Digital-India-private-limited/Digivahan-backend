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

// ─── Sound + Channel maps (Section 8 of handover) ────────────────────────────

const ANDROID_CHANNEL_MAP = {
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
  call_user:                    "call_user",
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
  call_user:                    "call_sound.caf", // special case – handover Section 8
};

const DEFAULT_ANDROID_CHANNEL = "default";
const DEFAULT_IOS_SOUND       = "default";
const FCM_BASE                = "https://fcm.googleapis.com/v1/projects";
const OAUTH_URL               = "https://oauth2.googleapis.com/token";
const FCM_SCOPE               = "https://www.googleapis.com/auth/firebase.messaging";

// ─── Token cache ─────────────────────────────────────────────────────────────

let _cachedToken  = null;
let _tokenExpiry  = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadServiceAccount() {
  // 1. Explicit path in env variable
  if (process.env.FCM_SERVICE_ACCOUNT_PATH) {
    const saPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
    const abs = path.isAbsolute(saPath) ? saPath : path.join(process.cwd(), saPath);
    if (fs.existsSync(abs)) {
      return JSON.parse(fs.readFileSync(abs, "utf8"));
    }
  }

  // 2. Check serviceAccountKey.json in project root
  const rootKey = path.join(__dirname, "../../serviceAccountKey.json");
  if (fs.existsSync(rootKey)) {
    return JSON.parse(fs.readFileSync(rootKey, "utf8"));
  }

  // 3. Check serviceAccountKey.json one directory above project root
  const parentKey = path.join(__dirname, "../../../serviceAccountKey.json");
  if (fs.existsSync(parentKey)) {
    return JSON.parse(fs.readFileSync(parentKey, "utf8"));
  }

  // 4. Bundled credentials (works out-of-the-box on Git deployment without manual file transfers)
  try {
    const bundled = require("../config/firebaseCredentials.js");
    if (bundled && bundled.project_id && bundled.private_key) {
      return bundled;
    }
  } catch (err) {
    // ignore
  }

  throw new Error(
    "[FCM] Firebase service-account credentials could not be loaded. " +
    "Provide serviceAccountKey.json or configure FCM_SERVICE_ACCOUNT_PATH."
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
  const projectId   = process.env.FCM_PROJECT_ID || sa.project_id || "digivahan-94702-dd898";
  const accessToken = await getAccessToken();

  const androidChannel = soundEnabled
    ? (ANDROID_CHANNEL_MAP[issue_type] || DEFAULT_ANDROID_CHANNEL)
    : DEFAULT_ANDROID_CHANNEL;

  const iosSound = soundEnabled
    ? (IOS_SOUND_MAP[issue_type] || DEFAULT_IOS_SOUND)
    : DEFAULT_IOS_SOUND;

  // All FCM data-payload values must be strings
  const data = {
    notification_type: String(notification_type),
    issue_type:        String(issue_type),
    vehicle_id:        String(vehicle_id),
    chat_room_id:      String(chat_room_id),
    sender_id:         String(sender_id),
    order_id:          String(order_id),
    latitude:          String(latitude),
    longitude:         String(longitude),
    channel_id:        androidChannel,
  };

  const message = {
    token: fcmToken,
    notification: { title, body },
    data,
    android: {
      priority: highPriority ? "high" : "normal",
      notification: {
        channel_id: androidChannel,
        sound:      androidChannel,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      headers: { "apns-priority": highPriority ? "10" : "5" },
      payload: {
        aps: {
          alert: { title, body },
          sound: iosSound,
          badge: badgeCount,
          "content-available": 1,
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
  IOS_SOUND_MAP,
};
