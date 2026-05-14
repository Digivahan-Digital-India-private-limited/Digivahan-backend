const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  createTipsTricks,
  updateTipsTricks,
  deleteTipsTricks,
  getAllTipsTricks,
  getSingleTipsTricks,
} = require("../controllers/tipsTricks.controller");

// CREATE
router.post(
  "/api/v1/tips-tricks",
  authenticateTokenForAdmin,
  upload.fields([{ name: "banner", maxCount: 1 }, { name: "icons" }]),
  createTipsTricks,
);

// UPDATE
router.patch(
  "/api/v1/tips-tricks/:id",
  authenticateTokenForAdmin,
  upload.fields([{ name: "banner", maxCount: 1 }, { name: "icons" }]),
  updateTipsTricks,
);

// DELETE
router.delete("/api/v1/tips-tricks/:id", authenticateTokenForAdmin, deleteTipsTricks);

// GET ALL
router.get("/api/v1/tips-tricks", getAllTipsTricks);

// GET SINGLE
router.get("/api/v1/tips-tricks/:id", getSingleTipsTricks);

module.exports = router;
