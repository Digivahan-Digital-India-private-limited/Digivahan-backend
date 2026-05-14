const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();
const { bypassupload } = require("../middleware/bypassCloudinary");

const {
  uploadNotificationImage,
  deleteNotificationImage,
} = require("../controllers/notificationImage.controller");

// Upload image
router.post(
  "/api/v1/notification/image",
  authenticateToken,
  bypassupload.single("image"),
  uploadNotificationImage
);

// DELETE image
router.post("/api/v1/notification/delete-image",
     authenticateToken,
     deleteNotificationImage);

module.exports = router;