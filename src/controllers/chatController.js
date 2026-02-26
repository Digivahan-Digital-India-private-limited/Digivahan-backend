const ChatList = require("../models/Chat");
const RoomSchema = require("../models/RoomSchema");
const mongoose = require("mongoose");

const SendUserMessage = async (req, res) => {
  try {
    const { chat_room_id, sender_id, message, latitude, longitude } = req.body;

    // ✅ validation
    if (!chat_room_id || !sender_id) {
      return res.status(400).json({
        status: false,
        message: "chat_room_id and sender_id required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(chat_room_id) ||
      !mongoose.Types.ObjectId.isValid(sender_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid IDs",
      });
    }

    // ✅ check room exists & sender is member
    const room = await RoomSchema.findOne({
      _id: chat_room_id,
      "members.user_id": sender_id,
    }).select("_id");

    if (!room) {
      return res.status(403).json({
        status: false,
        message: "Not authorized or room not found",
      });
    }

    // ✅ images from cloudinary
    const imageUrls = req.files?.map((file) => file.path) || [];

    if (!message && imageUrls.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Message or image required",
      });
    }

    // ✅ save message (FAST)
    const newMessage = await ChatList.create({
      chat_room_id,
      sender_id,
      message: message || "",
      images: imageUrls,
      location: {
        latitude: latitude || "",
        longitude: longitude || "",
      },
    });

    // ✅ update last message in room (optional but recommended)
    await RoomSchema.updateOne(
      { _id: chat_room_id },
      { lastMessage: newMessage._id },
    );

    return res.status(201).json({
      status: true,
      message: "Message sent",
      data: newMessage,
    });
  } catch (error) {
    console.error("SendUserMessage Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const getallChats = async (req, res) => {
  try {
    const { chat_room_id } = req.params;

    // ✅ validation
    if (!mongoose.Types.ObjectId.isValid(chat_room_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid chat_room_id",
      });
    }

    // ✅ find room
    const room = await RoomSchema.findById(chat_room_id)
      .select("members")
      .lean();

    if (!room) {
      return res.status(404).json({
        status: false,
        message: "Chat room not found",
      });
    }

    // ✅ fetch messages
    const messages = await ChatList.find({ chat_room_id })
      .sort({ message_timestamp: 1 }) // oldest first like WhatsApp
      .lean();

    // ✅ transform into chats array format
    const chats = messages.map((msg) => ({
      _id: msg._id,
      sender_id: msg.sender_id,
      message: msg.message,
      images: msg.images || [],
      latitude: msg.location?.latitude || "",
      longitude: msg.location?.longitude || "",
      deleted_by: msg.deleted_by || [],
      message_timestamp: msg.message_timestamp,
    }));

    // ✅ final response (exact format same as old)
    return res.status(200).json({
      status: true,
      totalMessages: chats.length,
      members: room.members,
      data: [
        {
          _id: messages[0]?._id || null,
          chat_room_id,
          chats,
          createdAt: messages[0]?.createdAt || null,
          updatedAt: messages[messages.length - 1]?.updatedAt || null,
        },
      ],
    });

  } catch (error) {
    console.error("Get chat details error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};


module.exports = { SendUserMessage, getallChats };
