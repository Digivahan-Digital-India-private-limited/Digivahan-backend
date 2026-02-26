const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sender_pic: String,

    sender_name: String,

    notification_type: {
      type: String,
      required: true,
      index: true,
    },

    notification_title: String,

    message: String,

    link: String,

    vehicle_id: {
      type: String,
      index: true,
    },

    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },

    chat_room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      index: true,
    },

    issue_type: String,

    latitude: String,

    longitude: String,

    incident_proof: [String],

    inapp_notification: {
      type: Boolean,
      default: true,
      index: true,
    },

    seen_status: {
      type: Boolean,
      default: false,
      index: true,
    },

    seen_at: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Critical index for fast fetch
notificationSchema.index({ receiver_id: 1, createdAt: -1 });
notificationSchema.index({ receiver_id: 1, seen_status: 1 });
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }, // 30 days
);

module.exports = mongoose.model("Notification", notificationSchema);
