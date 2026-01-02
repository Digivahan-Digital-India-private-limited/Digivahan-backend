const Room = require("../models/RoomSchema");

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
          (m) => m.user_id.toString() === userId.toString()
        );

        if (!isMember) {
          return console.log(
            `❌ User ${userId} is NOT part of this room (not allowed to join)`
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
    socket.on("send_message", async ({ roomId, message }) => {
      try {
        const room = await Room.findById(roomId);

        if (!room) return;

        // Validate that sender is in the room
        const isMember = room.members.some(
          (m) => m.user_id.toString() === socket.userId.toString()
        );

        if (!isMember) {
          console.log("❌ Sender is not a member of room");
          return;
        }

        // Emit message to all members inside the room
        io.to(roomId).emit("receive_message", {
          roomId,
          from: socket.userId,
          message,
        });

        console.log(`📨 Message sent in room ${roomId}`);
      } catch (err) {
        console.error("Error sending message:", err);
      }
    });

    /**
     * DISCONNECT
     */
    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
};

module.exports = { setupSocketIO };
