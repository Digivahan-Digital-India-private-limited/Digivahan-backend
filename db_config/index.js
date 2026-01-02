const mongoose = require("mongoose");
const { initializeModels } = require("./models.js");

const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return mongoose.connection;
    }

    const mongoURI =process.env.DB_URL;

    if (!mongoURI) {
      throw new Error("DB_URL is not defined in environment variables");
    }

    console.log("Attempting to connect to MongoDB...");

    const conn = await mongoose.connect(mongoURI, {
      // Optimize for serverless
      maxPoolSize: 1, // Reduced for serverless
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    // Initialize models after connection
    await initializeModels();

    return conn.connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    // Don't exit process in serverless environment
    if (process.env.VERCEL !== "1") {
      process.exit(1);
    }

    // Return null in serverless environment to allow graceful degradation
    return null;
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB Atlas");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected from MongoDB Atlas");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed through app termination");
  process.exit(0);
});

module.exports = connectDB;
