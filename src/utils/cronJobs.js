const cron = require("node-cron");
const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment"); 

function startDeletionCron() {

  // Runs every day at 12:00 AM (midnight)
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();

      const usersToDelete = await UserDeletion.find({
        deletion_date: { $lte: now },
        status: "PENDING",
      });

      for (const record of usersToDelete) {

        const userId = record.user_id;

        // 1. Find all QR IDs assigned to this user
        const assignedQRs = await QRAssignment.find({ user_id: userId });

        // 2. Block all QR IDs
        for (const qr of assignedQRs) {
          qr.status = "inactive";     // BLOCKED
          await qr.save();
        }

        // 3. Store saved QR IDs in deletion log
        record.qr_ids = assignedQRs.map(q => q.qr_id);
        record.qr_status = "BLOCKED";

        // 4. Delete the user
        await User.findByIdAndDelete(userId);

        // 5. Complete deletion process
        record.status = "COMPLETED";
        record.completed_at = new Date();
        await record.save();

        console.log(`User deleted & QR IDs blocked: ${userId}`);
      }

    } catch (error) {
      console.error("CRON ERROR:", error);
    }
  });

  console.log("User deletion CRON (12 AM daily) started...");
}

module.exports = startDeletionCron;
