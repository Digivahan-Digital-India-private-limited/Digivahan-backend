require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");

// Database and utils
const connectDB = require("./db_config/index.js");
const startDeletionCron = require("./src/utils/cronJobs.js");

// Base URL path
const { API_ROUTES } = require("./constants/index.js");

// Routes
const appInfoRoutes = require("./src/routes/appInfo.routes.js");
const fuelRoutes = require('./src/routes/fuel.routes.js');
const uploadRoutes = require('./src/routes/upload.routes.js');
const deleteImageRoutes = require('./src/routes/deleteImage.routes.js');
const razorpayRoutes = require("./src/routes/razorpay.routes.js");
const qrBenefitsRoutes = require("./src/routes/qrBenefits.routes.js");
const newsRoutes = require("./src/routes/news.routes.js");
const tipsTricksRoutes = require("./src/routes/tipsTricks.routes.js");
const notificationImageRoutes = require("./src/routes/notificationImage.routes.js");
const authRoutes = require("./src/routes/auth.routes.js");
const profileDeletation = require("./src/routes/profileDeletation.routes.js");
const profileUpdateRoutes = require("./src/routes/profileUpdate.routes.js");
const emergencyContactRoutes = require("./src/routes/emergencyContact.routes.js");
const addUserAddressRoutes = require("./src/routes/userAddress.routes.js");
const garageRoutes = require("./src/routes/garage.routes.js");
const uploadVehicleDoc = require("./src/routes/uploadvehicleDoc.routes.js");
const userReviewroutes = require("./src/routes/addReview.routes.js");
const userOrderRoutes = require("./src/routes/order.routes.js");
const roomRoutes = require("./src/routes/rooom.routes.js");
const notificationRoutes = require("./src/routes/notification.routes.js");
const QRroutes = require("./src/routes/qr.routes.js")
const chatRoutes = require("./src/routes/chats.routes.js")
const trendingCarsRoutes = require("./src/routes/trendingCars.route.js")
const CompareVehicleRoutes = require("./src/routes/vehicleComparison.routes.js")
const contactUserRoutes = require("./src/routes/contactUser.routes.js");

// Socket.IO handler
const { setupSocketIO } = require("./src/socket/socketHandler.js");

const app = express();

// -------------------- MIDDLEWARES --------------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));



// Database connection middleware
app.use(async (req, res, next) => {
  try {
    // Only connect if not already connected
    if (require("mongoose").connection.readyState !== 1) {
      await connectDB();
      startDeletionCron()
    }
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    // In serverless, continue without database for graceful degradation
    next();
  }
});

// Hasan Routes Code 
app.use(appInfoRoutes);
app.use(fuelRoutes);
app.use(uploadRoutes);
app.use(deleteImageRoutes);
app.use(razorpayRoutes);
app.use(qrBenefitsRoutes);
app.use(newsRoutes);
app.use(tipsTricksRoutes);
app.use(notificationImageRoutes);

// -------------------- ROUTES --------------------

app.use(API_ROUTES.AUTH.BASE, authRoutes);
app.use(API_ROUTES.USER.BASE, profileDeletation);
app.use(API_ROUTES.UPDATE_USER.BASE, profileUpdateRoutes);
app.use(API_ROUTES.EMERGENCY_CONTACT.BASE, emergencyContactRoutes);
app.use(API_ROUTES.ADDRESSBOOK.BASE, addUserAddressRoutes);
app.use(API_ROUTES.GARAGE.BASE, garageRoutes);
app.use(API_ROUTES.UPLOAD.BASE, uploadVehicleDoc);
app.use(API_ROUTES.REVIEW.BASE, userReviewroutes);
app.use(API_ROUTES.ORDER.BASE, userOrderRoutes);
app.use(API_ROUTES.CHAT.BASE, roomRoutes);
app.use(API_ROUTES.NOTIFICATION.BASE, notificationRoutes);
app.use(API_ROUTES.QR.BASE, QRroutes)
app.use(API_ROUTES.TRENDING_CARS.BASE, trendingCarsRoutes)
app.use(API_ROUTES.VEHICLE_COMPARISON_UPDATE.BASE, CompareVehicleRoutes)
app.use(API_ROUTES.CHAT.BASE, chatRoutes)
app.use(API_ROUTES.CONTACT.BASE, contactUserRoutes);

// -------------------- HEALTH CHECK --------------------
// Serve HTML file
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html"));
// });

app.get("/", (req, res) => {
  res.status(200).json({message:"Welcome To Digivahan Server"});
});

// -------------------- SERVER SETUP --------------------
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // Update with frontend URL in production
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup Socket.IO handlers
setupSocketIO(io);

// -------------------- DATABASE CONNECTION --------------------
(async () => {
  try {
    await connectDB(); // Connect to MongoDB
    startDeletionCron(); // Start cron jobs
    console.log("Database connected and cron jobs started ✅");
  } catch (error) {
    console.error("Startup error:", error);
  }
})();

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
