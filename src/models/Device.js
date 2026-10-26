/**
 * Device Model — DigiVahan
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores per-device push-notification tokens.  A single user can have multiple
 * registered devices.  Identified by (user_id + uuid) to prevent duplicates.
 *
 * Fields added per FCM handover (Section 4):
 *   fcm_token        – Latest FCM registration token
 *   player_id        – Existing OneSignal Player ID (retained for fallback)
 *   device_type      – "android" | "ios"
 *   token_updated_at – Timestamp of last token update
 */

"use strict";

const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    /* ── Identity ────────────────────────────────────────────────────────── */
    user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    // Device UUID supplied by the mobile app – used to deduplicate records
    uuid: {
      type:     String,
      required: true,
      trim:     true,
    },

    /* ── Device metadata ─────────────────────────────────────────────────── */
    device_name: {
      type:    String,
      default: "",
      trim:    true,
    },

    device_version: {
      type:    String,
      default: "",
      trim:    true,
    },

    device_model: {
      type:    String,
      default: "",
      trim:    true,
    },

    app_version: {
      type:    String,
      default: "",
      trim:    true,
    },

    device_type: {
      type:    String,
      enum:    ["android", "ios", ""],
      default: "",
    },

    /* ── Push tokens ─────────────────────────────────────────────────────── */

    // FCM registration token (primary push path)
    fcm_token: {
      type:    String,
      default: "",
    },

    // OneSignal Player ID (fallback push path – do NOT remove)
    player_id: {
      type:    String,
      default: "",
    },

    // When the FCM token was last written
    token_updated_at: {
      type:    Date,
      default: null,
    },

    /* ── Status ──────────────────────────────────────────────────────────── */
    is_active: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One record per (user, device-uuid) pair
deviceSchema.index({ user_id: 1, uuid: 1 }, { unique: true });

// Fast lookup by FCM token (for cleanup of stale tokens)
deviceSchema.index({ fcm_token: 1 }, { sparse: true });

// Fast lookup by OneSignal player_id
deviceSchema.index({ player_id: 1 }, { sparse: true });

module.exports = mongoose.model("Device", deviceSchema);
