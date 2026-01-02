const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    type: { type: String, enum: ["direct", "group"], default: "direct" },

    // ⬇⬇⬇ UPDATED: members array containing object with full user details
    members: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        first_name: { type: String, default: "" },
        last_name: { type: String, default: "" },
        profile_pic_url: { type: String, default: "" },
        role: { type: String, default: "user" }, // creator = admin, others = user
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    isPrivate: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
