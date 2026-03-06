const Room = require("../models/RoomSchema");
const ChatList = require("../models/Chat");

const setupSocketIO = (io) => {
  io.on("connection", (socket) => {
    console.log("New user connected");

    /**
     * USER JOINS ROOM
     */
    socket.on("join_room", async ({ roomId, userId }) => {
      socket.userId = userId;

      try {
        let room = await Room.findById(roomId);

        if (!room) {
          return console.log("❌ Room not found");
        }

        // Convert userId to string for safer matching
        const isMember = room.members.some(
          (m) => m.user_id.toString() === userId.toString(),
        );

        if (!isMember) {
          return console.log(
            `❌ User ${userId} is NOT part of this room (not allowed to join)`,
          );
        }

        // Join the socket room
        socket.join(roomId);

        // Send updated members to frontend
        const formattedMembers = room.members.map((m) => ({
          user_id: m.user_id,
          first_name: m.first_name,
          last_name: m.last_name,
          profile_pic_url: m.profile_pic_url,
          role: m.role,
        }));

        io.to(roomId).emit("room_members", formattedMembers);

        console.log(`✅ User ${userId} joined room ${roomId}`);
      } catch (err) {
        console.error("Error joining room:", err);
      }
    });

    /**
     * SEND MESSAGE TO ROOM MEMBERS
     */
    socket.on("send_message", async (data) => {
      try {
        const { roomId, message, images, location } = data;

        const room = await Room.findById(roomId);
        if (!room) return;

        const isMember = room.members.some(
          (m) => m.user_id.toString() === socket.userId.toString(),
        );

        if (!isMember) {
          console.log("❌ Sender not a member of room");
          return;
        }

        // ✅ SAVE MESSAGE
        const newMessage = await ChatList.create({
          chat_room_id: roomId,
          sender_id: socket.userId,
          message: message || "",
          images: images || [],
          location: {
            latitude: location?.latitude || "",
            longitude: location?.longitude || "",
          },
        });

        // update last message
        await Room.updateOne({ _id: roomId }, { lastMessage: newMessage._id });

        // ✅ EMIT REALTIME MESSAGE
        io.to(roomId).emit("receive_message", {
          ...newMessage.toObject(),
          from: socket.userId,
        });

        console.log("📨 Message saved + sent");
      } catch (err) {
        console.error("Socket message error:", err);
      }
    });

    /**
     * DISCONNECT
     */

    // 👑 ADMIN JOINS ADMIN ROOM
    socket.on("join_admin_room", ({ adminId }) => {
      if (!adminId) {
        console.log("❌ Admin ID missing");
        return;
      }

      socket.adminId = adminId;

      // Join common admin room
      socket.join("join_admin_room");
      console.log(`👑 Admin ${adminId} joined admin_room`);
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
};

module.exports = { setupSocketIO };
