const Room = require("../models/RoomSchema");
const User = require("../models/User");
const mongoose = require("mongoose");

const createRoom = async (req, res) => {
  try {
    let { type, members = [], isPrivate = false, createdBy, name } = req.body;

    // ===============================
    // VALIDATIONS
    // ===============================
    if (!createdBy)
      return res.status(400).json({ message: "createdBy user_id is required" });

    if (!type)
      return res
        .status(400)
        .json({ message: "type is required (direct/group)" });

    // Fetch Creator
    const creator = await User.findById(createdBy).select(
      "basic_details.profile_pic basic_details.first_name basic_details.last_name"
    );

    if (!creator)
      return res.status(404).json({ message: "Creator user not found" });

    // ====================================================
    // 🔵 DIRECT CHAT LOGIC
    // ====================================================
    if (type === "direct") {
      if (members.length !== 1)
        return res.status(400).json({
          message: "Direct chat requires ONLY 1 targetUserId",
        });

      const targetUserId = members[0];

      const target = await User.findById(targetUserId).select(
        "basic_details.profile_pic basic_details.first_name basic_details.last_name"
      );

      if (!target)
        return res.status(404).json({ message: "Target user not found" });

      // Check existing direct room
      const existingRoom = await Room.findOne({
        type: "direct",
        "members.user_id": { $all: [createdBy, targetUserId] },
        members: { $size: 2 },
      });

      if (existingRoom) {
        await pushRoomToUserChatbox(createdBy, existingRoom);
        await pushRoomToUserChatbox(targetUserId, existingRoom);

        return res.status(200).json({
          status: true,
          message: "Direct chat already exists",
          room: existingRoom,
        });
      }

      // Members of the new room
      const roomMembers = [
        {
          user_id: createdBy,
          first_name: creator.basic_details.first_name,
          last_name: creator.basic_details.last_name,
          profile_pic_url: creator.basic_details.profile_pic,
          role: "admin",
        },
        {
          user_id: targetUserId,
          first_name: target.basic_details.first_name,
          last_name: target.basic_details.last_name,
          profile_pic_url: target.basic_details.profile_pic,
          role: "member",
        },
      ];

      // Create Room
      const newRoom = await Room.create({
        name: creator.basic_details.first_name,
        type: "direct",
        members: roomMembers,
        createdBy,
        isPrivate: true,
      });

      // Push to chat_box of both users
      await pushRoomToUserChatbox(createdBy, newRoom);
      await pushRoomToUserChatbox(targetUserId, newRoom);

      return res.status(201).json({
        status: true,
        message: "Direct chat created successfully",
        room: newRoom,
      });
    }

    // ====================================================
    // 🔶 GROUP CHAT LOGIC
    // ====================================================
    if (type === "group") {
      if (members.length < 2)
        return res
          .status(400)
          .json({ message: "Group must contain at least 2 members" });

      // Ensure creator is included
      if (!members.includes(createdBy)) members.push(createdBy);

      const users = await User.find({ _id: { $in: members } }).select(
        "basic_details.profile_pic basic_details.first_name basic_details.last_name"
      );

      const roomMembers = users.map((u) => ({
        user_id: u._id,
        first_name: u.basic_details.first_name,
        last_name: u.basic_details.last_name,
        profile_pic_url: u.basic_details.profile_pic,
        role: u._id.toString() === createdBy ? "admin" : "member",
      }));

      // Create group room
      const groupRoom = await Room.create({
        name,
        type: "group",
        members: roomMembers,
        createdBy,
        isPrivate,
      });

      // Push to chat_box of all members
      for (let m of roomMembers) {
        await pushRoomToUserChatbox(m.user_id, groupRoom);
      }

      return res.status(201).json({
        message: "Group chat created successfully",
        room: groupRoom,
      });
    }
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ status: false, message: err.message });
  }
};

// =========================================================
// 🔥 Helper Function: Push Room to User.chat_box
// =========================================================
async function pushRoomToUserChatbox(userId, room) {
  try {
    const objectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(objectId);
    if (!user) return;

    if (!user.chat_box) user.chat_box = [];

    // Check if already exists
    const exists = user.chat_box.some(
      (cb) => cb.roomId.toString() === room._id.toString()
    );

    if (!exists) {
      user.chat_box.push({
        roomId: room._id,
        type: room.type,
        members: room.members,
        lastMessage: "",
      });

      await user.save();
    }
  } catch (err) {
    console.log("Error updating chat_box:", err);
  }
}

const getAllChatRoomFromUserAccount = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Convert to ObjectId
    const objectId = new mongoose.Types.ObjectId(user_id);

    // Find user
    const user = await User.findById(objectId).select("chat_box");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Chat list fetched successfully",
      chat_list: user.chat_box || [],
    });
  } catch (error) {
    console.error("Error fetching chat list:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const GetChatRoomInfo = async (req, res) => {
  try {
    const { room_id } = req.params;

    if (!room_id) {
      return res.status(400).json({
        status: false,
        message: "room_id is required",
      });
    }

    // 🔍 Find room by _id
    const room = await Room.findById(room_id);

    if (!room) {
      return res.status(404).json({
        status: false,
        message: "Chat room not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Chat room info fetched successfully",
      data: room,
    });
  } catch (error) {
    console.error("GetChatRoomInfo error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


module.exports = { createRoom, getAllChatRoomFromUserAccount, GetChatRoomInfo };
