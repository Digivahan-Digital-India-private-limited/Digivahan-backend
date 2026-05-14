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

        // 1. Fetch all active QR codes assigned to this user (for logging)
        const assignedQRs = await QRAssignment.find({ assigned_to: userId }).select("qr_id");
        record.qr_ids = assignedQRs.map(q => q.qr_id);
        record.qr_status = "BLOCKED";

        // 2. Block all QR assignments for this user (Optimized)
        await QRAssignment.updateMany(
          { assigned_to: userId },
          { status: "inactive" }
        );

        // 3. Delete the user
        await User.findByIdAndDelete(userId);

        // 4. Complete deletion process record
        record.status = "COMPLETED";
        record.completed_at = new Date();
        await record.save();

        console.log(`[CRON] User permanently deleted: ${userId}`);
      }

    } catch (error) {
      console.error("CRON ERROR:", error);
    }
  });

  console.log("User deletion CRON (12 AM daily) started...");
}

module.exports = startDeletionCron;
