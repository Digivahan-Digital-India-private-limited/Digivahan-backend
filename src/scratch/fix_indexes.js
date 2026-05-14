const mongoose = require("mongoose");
require("dotenv").config({ path: "../../.env" });

const dropEmailIndex = async () => {
  try {
    const dbUrl = process.env.DB_URL || "mongodb+srv://digivahan_database:Digivahan2023@digivahan.nmic3hq.mongodb.net/Digivahan";
    console.log("Connecting to:", dbUrl);
    
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.collection("users");
    
    console.log("Current indexes:");
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    const emailIndex = indexes.find(idx => idx.name === "basic_details.email_1");
    
    if (emailIndex) {
      console.log("Dropping basic_details.email_1 index...");
      await collection.dropIndex("basic_details.email_1");
      console.log("Index dropped successfully!");
    } else {
      console.log("Index basic_details.email_1 not found.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

dropEmailIndex();
