/**
 * Device Controller — DigiVahan
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles POST /api/device/device_data
 *
 * The mobile apps call this on app-launch / login and whenever Firebase
 * refreshes the FCM token.  The endpoint upserts a device record keyed on
 * (user_id + uuid) so token refreshes never create duplicate rows.
 *
 * Request body (from handover Section 5):
 *  {
 *    hit_by:         "add",
 *    user_id:        "...",
 *    uuid:           "DEVICE_UUID",
 *    device_name:    "Samsung / iPhone",
 *    device_version: "Android 14 / iOS 17.5",
 *    device_model:   "SM-G998B / iPhone 15 Pro",
 *    app_version:    "1.2.2",
 *    player_id:      "ONESIGNAL_PLAYER_ID",
 *    fcm_token:      "FCM_REGISTRATION_TOKEN"
 *  }
 */

"use strict";

const mongoose = require("mongoose");
const User     = require("../models/User");
const Device   = require("../models/Device");

/**
 * POST /api/device/device_data
 * Upsert device record with the latest FCM / OneSignal tokens.
 */
const saveDeviceData = async (req, res) => {
  try {
    const {
      hit_by,
      user_id,
      uuid,
      device_name    = "",
      device_version = "",
      device_model   = "",
      app_version    = "",
      player_id      = "",
      fcm_token      = "",
      device_type    = "",
    } = req.body;

    /* ── 1. Validate required fields ─────────────────────────────────────── */

    if (!user_id || !uuid) {
      return res.status(400).json({
        status:  false,
        message: "user_id and uuid are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status:  false,
        message: "Invalid user_id",
      });
    }

    /* ── 2. Verify that the user actually exists ──────────────────────────── */

    const userExists = await User.exists({ _id: user_id });
    if (!userExists) {
      return res.status(404).json({
        status:  false,
        message: "User not found",
      });
    }

    /* ── 3. Build the update document ────────────────────────────────────── */

    const now = new Date();

    const setFields = {
      device_name,
      device_version,
      device_model,
      app_version,
      is_active: true,
    };

    // Only update device_type if a value is supplied
    if (device_type) {
      setFields.device_type = device_type.toLowerCase();
    }

    // Update player_id when provided (preserve existing value otherwise)
    if (player_id) {
      setFields.player_id = player_id;
    }

    // Update FCM token and timestamp only when the token has a value
    if (fcm_token) {
      setFields.fcm_token        = fcm_token;
      setFields.token_updated_at = now;
    }

    /* ── 4. Upsert (create or update the matching device record) ────────── */

    const device = await Device.findOneAndUpdate(
      { user_id, uuid },        // match key
      { $set: setFields },
      {
        upsert:         true,   // create if not found
        new:            true,
        setDefaultsOnInsert: true,
      }
    );

    /* ── 5. Safe log (never log full token in production) ───────────────── */

    const tokenPreview = fcm_token
      ? `${fcm_token.slice(0, 8)}...${fcm_token.slice(-4)}`
      : "(none)";
    console.log(
      `[DeviceData] user=${user_id} uuid=${uuid} fcm=${tokenPreview} hit=${hit_by}`
    );

    /* ── 6. Response ──────────────────────────────────────────────────────── */

    return res.status(200).json({
      status:  true,
      message: "Device data updated successfully",
    });

  } catch (err) {
    // Duplicate-key can occur on rapid concurrent calls for the same device;
    // treat it as a successful no-op rather than an error.
    if (err.code === 11000) {
      return res.status(200).json({
        status:  true,
        message: "Device data updated successfully",
      });
    }

    console.error("[DeviceData] Error:", err.message);
    return res.status(500).json({
      status:  false,
      message: "Internal server error",
    });
  }
};

module.exports = { saveDeviceData };
