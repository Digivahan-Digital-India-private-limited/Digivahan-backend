const mongoose = require("mongoose");
const { initializeModels } = require("./models.js");

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (attempt = 1) => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return mongoose.connection;
    }

    const mongoURI = process.env.DB_URL;

    if (!mongoURI) {
      throw new Error("DB_URL is not defined in environment variables");
    }

    console.log(`Attempting to connect to MongoDB... (attempt ${attempt}/${MAX_RETRIES})`);

    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // 30s — handles Atlas cold starts
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      retryWrites: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    // Initialize models after connection
    await initializeModels();

    return conn.connection;
  } catch (error) {
    console.error(`Error connecting to MongoDB (attempt ${attempt}):`, error.message);

    if (attempt < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
      return connectDB(attempt + 1);
    }

    console.error("All MongoDB connection attempts failed. Server will continue without DB.");
    // Do NOT call process.exit — let nodemon keep running & watching
    return null;
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB Atlas ✅");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err.message);
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
