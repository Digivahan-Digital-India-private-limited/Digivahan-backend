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
      return res.status(400).json({
        status: false,
        message: "createdBy user_id is required",
      });

    if (!type)
      return res.status(400).json({
        status: false,
        message: "type is required (direct/group)",
      });

    // Fetch Creator
    const creator = await User.findById(createdBy).select(
      "basic_details.profile_pic basic_details.first_name basic_details.last_name",
    );

    if (!creator)
      return res.status(404).json({
        status: false,
        message: "Creator user not found",
      });

    // ====================================================
    // 🔵 DIRECT CHAT LOGIC
    // ====================================================
    if (type === "direct") {
      if (members.length !== 1)
        return res.status(400).json({
          status: false,
          message: "Direct chat requires ONLY 1 targetUserId",
        });

      const targetUserId = members[0];

      // 🔥 Fetch target user
      const target = await User.findById(targetUserId).select(
        "basic_details.profile_pic basic_details.first_name basic_details.last_name",
      );

      if (!target)
        return res.status(404).json({
          status: false,
          message: "Target user not found",
        });

      // 🔥 Check existing room
      const existingRoom = await Room.findOne({
        type: "direct",
        "members.user_id": { $all: [createdBy, targetUserId] },
        members: { $size: 2 },
      });

      if (existingRoom) {
        await Promise.all([
          pushRoomToUserChatbox(createdBy, existingRoom),
          pushRoomToUserChatbox(targetUserId, existingRoom),
        ]);

        return res.status(200).json({
          status: true,
          message: "Direct chat already exists",
          room: existingRoom,
        });
      }

      // 🔥 Prepare members
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

      // 🔥 Create Room
      const newRoom = await Room.create({
        name: creator.basic_details.first_name,
        type: "direct",
        members: roomMembers,
        createdBy,
        isPrivate: true,
      });

      // 🔥 Push to chatbox in parallel (OPTIMIZED)
      await Promise.all([
        pushRoomToUserChatbox(createdBy, newRoom),
        pushRoomToUserChatbox(targetUserId, newRoom),
      ]);

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
        return res.status(400).json({
          status: false,
          message: "Group must contain at least 2 members",
        });

      // Ensure creator included
      if (!members.includes(createdBy)) members.push(createdBy);

      const users = await User.find({
        _id: { $in: members },
      }).select(
        "basic_details.profile_pic basic_details.first_name basic_details.last_name",
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

      // 🔥 Push chatbox in parallel (OPTIMIZED)
      await Promise.all(
        roomMembers.map((member) =>
          pushRoomToUserChatbox(member.user_id, groupRoom),
        ),
      );

      return res.status(201).json({
        status: true,
        message: "Group chat created successfully",
        room: groupRoom,
      });
    }

    return res.status(400).json({
      status: false,
      message: "Invalid room type",
    });
  } catch (err) {
    console.error("Error creating room:", err);

    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// =========================================================
// 🔥 Helper Function: Push Room to User.chat_box
// =========================================================
async function pushRoomToUserChatbox(userId, roomId) {
  try {
    await User.updateOne(
      { _id: userId },
      {
        $addToSet: {
          chat_rooms: roomId,
        },
      },
    );
  } catch (err) {
    console.log("Error updating chat_rooms:", err);
  }
}

const getAllChatRoomFromUserAccount = async (req, res) => {
  try {
    const { user_id } = req.body;

    /* ===============================
       1️⃣ Validate user_id
    =============================== */

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: false,
        message: "Valid user_id is required",
      });
    }

    /* ===============================
       2️⃣ Find user and get room ids
    =============================== */

    const user = await User.findById(user_id).select("chat_rooms").lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const roomIds = user.chat_rooms || [];

    if (roomIds.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No rooms found",
        total_rooms: 0,
        rooms: [],
      });
    }

    /* ===============================
       3️⃣ Fetch full room details
    =============================== */

    const rooms = await Room.find({
      _id: { $in: roomIds },
    })
      .sort({ updatedAt: -1 })
      .lean();

    /* ===============================
       4️⃣ Return full Room documents
    =============================== */

    return res.status(200).json({
      status: true,
      message: "Rooms fetched successfully",
      total_rooms: rooms.length,
      rooms: rooms,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const GetChatRoomInfo = async (req, res) => {
  try {
    const { room_id } = req.params;

    // ✅ Validate room_id
    if (!room_id || !mongoose.Types.ObjectId.isValid(room_id)) {
      return res.status(400).json({
        status: false,
        message: "Valid room_id is required",
      });
    }

    // ✅ Fetch room with lean (faster)
    const room = await Room.findById(room_id)
      .select("-__v") // optional: remove unnecessary field
      .lean();

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
    });
  }
};

module.exports = { createRoom, getAllChatRoomFromUserAccount, GetChatRoomInfo };
