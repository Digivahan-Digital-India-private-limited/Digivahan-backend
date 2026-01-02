const mongoose = require("mongoose");

const chatListSchema = new mongoose.Schema(
  {
    // 🔗 Chat Room ID (ONE document per room)
    chat_room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },

    // 💬 All messages of this room
    chats: [
      {
        // 🧑 Sender
        sender_id: {
          type: String,
          required: true,
          index: true,
        },

        // 💬 Text message
        message: {
          type: String,
          trim: true,
          default: "",
        },

        // 🖼 Images (Cloudinary URLs)
        images: [
          {
            type: String,
          },
        ],

        // 📍 Location
        latitude: {
          type: String,
          default: "",
        },
        longitude: {
          type: String,
          default: "",
        },

        // 🗑 Deleted by users
        deleted_by: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],

        // ⏰ Message timestamp
        message_timestamp: {
          type: Date,
          default: Date.now,
          index: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 🔥 Indexes (message list fast load)
chatListSchema.index({ chat_room_id: 1, message_timestamp: -1 });
chatListSchema.index({ sender_id: 1 });

module.exports = mongoose.model("ChatList", chatListSchema);
