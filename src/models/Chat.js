const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chat_room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    location: {
      latitude: { type: String, default: "" },
      longitude: { type: String, default: "" },
    },

    deleted_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    message_timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 🔥 Important indexes
chatMessageSchema.index({ chat_room_id: 1, message_timestamp: -1 });
chatMessageSchema.index({ sender_id: 1 });

module.exports = mongoose.model("ChatList", chatMessageSchema);
