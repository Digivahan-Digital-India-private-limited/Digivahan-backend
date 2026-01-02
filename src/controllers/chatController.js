const ChatList = require("../models/Chat");
const RoomSchema = require("../models/RoomSchema");

const SendUserMessage = async (req, res) => {
  try {
    const { chat_room_id, sender_id, message, latitude, longitude } = req.body;

    // 🔴 Basic validation
    if (!chat_room_id || !sender_id) {
      return res.status(400).json({
        success: false,
        message: "chat_room_id and sender_id are required",
      });
    }

    // 1️⃣ Find chat room
    const room = await RoomSchema.findById(chat_room_id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // 2️⃣ Check sender is member of room
    const isMember = room.members.some(
      (member) => member.user_id.toString() === sender_id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Sender is not a member of this chat room",
      });
    }

    // 3️⃣ Get images from Cloudinary (form-data)
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path); // ✅ Cloudinary URL
    }

    // ❗ Message ya image me se kuch ek required
    if (!message && imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message or image is required",
      });
    }

    // 4️⃣ Message object (jo chats array me jayega)
    const chatMessage = {
      sender_id,
      message: message || "",
      images: imageUrls,
      latitude: latitude || "",
      longitude: longitude || "",
      deleted_by: [],
      message_timestamp: new Date(),
    };

    // 5️⃣ Find chat list by room
    let chatList = await ChatList.findOne({ chat_room_id });

    if (!chatList) {
      // 🆕 First message of room
      chatList = await ChatList.create({
        chat_room_id,
        chats: [chatMessage],
      });
    } else {
      // ➕ Push new message
      chatList.chats.push(chatMessage);
      await chatList.save();
    }

    return res.status(201).json({
      status: true,
      message: "Message sent successfully",
      data: chatMessage,
    });
  } catch (error) {
    console.error("SendUserMessage Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getallChatDetails = async (req, res) => {
  try {
    const { chat_room_id } = req.params;

    // 🔴 Validation
    if (!chat_room_id) {
      return res.status(400).json({
        success: false,
        message: "chat_room_id is required",
      });
    }

    // 1️⃣ Check room exists
    const room = await RoomSchema.findById(chat_room_id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // 2️⃣ Fetch all messages of this room
    const chats = await ChatList.find({ chat_room_id })
      .sort({ message_timestamp: -1 }) // latest first
      .populate("chats.sender_id", "name avatar") // optional
      .lean();

    return res.status(200).json({
      status: true,
      totalMessages: chats.length,
      members: room.members,
      data: chats,
    });
  } catch (error) {
    console.error("Get chat details error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = { SendUserMessage, getallChatDetails };
