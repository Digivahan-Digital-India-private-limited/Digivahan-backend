const cron = require("node-cron");
const User = require("../models/User");
const UserDeletion = require("../models/UserDeletion");
const QRAssignment = require("../models/QRAssignment"); 
const DeleteAccountRequest = require("../models/deleteAccountRequest.model");

function startCronJobs() {

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

        // 3. Complete DeleteAccountRequest
        await DeleteAccountRequest.updateMany(
          { user_id: userId },
          { $set: { status: "completed" } }
        );

        // 4. Delete the user
        await User.findByIdAndDelete(userId);

        // 5. Complete deletion process record
        record.status = "COMPLETED";
        record.completed_at = new Date();
        await record.save();

        console.log(`[CRON] User permanently deleted: ${userId}`);
      }

      // Also process any users pending deletion in User collection directly
      const pendingUsers = await User.find({
        account_status: "PENDING_DELETION",
        deletion_date: { $lte: now },
      });

      for (const u of pendingUsers) {
        await QRAssignment.updateMany({ assigned_to: u._id }, { status: "inactive" });
        await DeleteAccountRequest.updateMany({ user_id: u._id }, { $set: { status: "completed" } });
        await UserDeletion.findOneAndUpdate(
          { user_id: u._id },
          { $set: { status: "COMPLETED", completed_at: new Date() } },
          { upsert: true }
        );
        await User.findByIdAndDelete(u._id);
        console.log(`[CRON] Scheduled user auto-deleted: ${u._id}`);
      }

    } catch (error) {
      console.error("CRON ERROR:", error);
    }
  });

  // Runs every 3 days at 12:00 AM (midnight)
  cron.schedule("0 0 */3 * *", async () => {
    try {
      console.log("[CRON] Running 3-day challan credits reset & topup...");
      // 1. For special user (8933831760): add +3 credits every 3 days (never decrease or reset to 3)
      const specialResult = await User.updateMany(
        { "basic_details.phone_number": /8933831760$/ },
        { $inc: { challan_credits: 3 } }
      );
      console.log(`[CRON] Added +3 challan credits to special user 8933831760. Modified: ${specialResult.modifiedCount}`);

      // 2. For all normal users (excluding 8933831760): top up credits to exactly 3 if not already 3
      const result = await User.updateMany(
        {
          "basic_details.phone_number": { $not: /8933831760$/ },
          challan_credits: { $ne: 3 }
        },
        { $set: { challan_credits: 3 } }
      );
      console.log(`[CRON] Challan credits topped up to 3 for ${result.modifiedCount} users.`);
    } catch (error) {
      console.error("[CRON] Challan credits reset ERROR:", error);
    }
  });

  console.log("User deletion CRON (12 AM daily) started...");
  console.log("Challan Credits Reset CRON (Every 3 days) started...");
}

module.exports = startCronJobs;
