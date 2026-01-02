// Optional: Create some initial data or perform setup tasks
const initializeModels = async () => {
  try {
    console.log("📋 Models initialized successfully");
    console.log("📊 Available models:");
    console.log("  - User (users collection)");
    console.log("  - TempUser (tempusers collection)");
    console.log("  - OTP (otps collection)");
    console.log("  - AppKeys (appkeys collection)");
    console.log("  - DeviceData (devicedatas collection)");
    console.log("  - QRAssignment (qrassignments collection)");
    console.log("  - FuelPrice (fuelprices collection)");
    console.log("  - UserDeletion (userdeletions collection)");
    console.log("  - Notification (notifications collection)");
    console.log("  - AccessCode (accesscodes collection)");
    console.log("  - Order (orders collection)");
    console.log("  - Review (reviews collection)");
    console.log("  - Chat (chats collection)");
    console.log("  - Message (messages collection)");

    // Optional: Check if collections exist and log their status
    const db = require("mongoose").connection.db;

    if (db) {
      const collections = await db.listCollections().toArray();
      console.log(
        "📁 Existing collections:",
        collections.map((c) => c.name)
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Error initializing models:", error);
    return false;
  }
};

module.exports = {
  initializeModels,
};