const express = require("express");
const router = express.Router();

const controller = require("../controllers/concern.controller");

// cloudinary upload middleware
const { upload } = require("../middleware/cloudinary");

// Raise concern with images
router.post(
  "/raise",
  upload.array("incidentProof", 5), // max 5 images
  controller.raiseConcern
);

router.get("/list", controller.getConcerns);

// User-accessible route to fetch a single concern by ID (for real-time chat polling)
router.get("/detail/:id", controller.getConcernById);

router.put("/conversation/:id", controller.addConversation);

router.put("/status/:id", controller.updateStatus);

router.delete("/delete/:id", controller.deleteConcern);
router.delete("/delete", controller.deleteConcern);

module.exports = router;