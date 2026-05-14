const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const {
  createNews,
  updateNews,
  deleteNews,
  getAllNews,
} = require("../controllers/news.controller");

const { upload } = require("../middleware/cloudinary");

// CREATE
router.post("/api/v1/news", authenticateTokenForAdmin, upload.single("banner"), createNews);

// UPDATE
router.patch("/api/v1/news/:id", authenticateTokenForAdmin, upload.single("banner"), updateNews);

// DELETE
router.delete("/api/v1/news/:id", authenticateTokenForAdmin, deleteNews);

// FETCH ALL
router.get("/api/v1/news", getAllNews);

module.exports = router;
