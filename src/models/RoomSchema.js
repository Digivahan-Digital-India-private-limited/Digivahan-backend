const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true, // 🔥 fast filtering
    },

    members: [
      {
        _id: false, // 🔥 THIS LINE PREVENTS AUTO ID CREATION
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
          index: true, // 🔥 critical index
        },
        first_name: { type: String, default: "" },
        last_name: { type: String, default: "" },
        profile_pic_url: { type: String, default: "" },
        role: { type: String, default: "user" },
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true, // 🔥 fast sorting
    },

    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 🔥 important
    },
  },
  { timestamps: true },
);

//
// 🔥 COMPOUND INDEXES (VERY IMPORTANT)
//

// direct chat lookup optimization
roomSchema.index(
  { type: 1, "members.user_id": 1 },
  { name: "room_member_lookup_index" },
);

// creator lookup
roomSchema.index(
  { createdBy: 1, createdAt: -1 },
  { name: "creator_room_index" },
);

// last message sorting
roomSchema.index({ updatedAt: -1 }, { name: "latest_room_index" });

module.exports = mongoose.model("Room", roomSchema);
