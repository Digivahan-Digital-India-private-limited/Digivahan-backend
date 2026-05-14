const express = require("express");
const router = express.Router();
const controller = require("../controllers/deleteAccount.controller");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth");

router.post("/raise", authenticateToken, controller.raiseDeleteRequest);
router.get("/status", authenticateToken, controller.getDeleteRequestStatus);

// Admin Routes
router.get("/list", authenticateTokenForAdmin, controller.getDeleteRequests);
router.put("/status/:id", authenticateTokenForAdmin, controller.updateDeleteRequestStatus);
router.delete("/request/:id", authenticateTokenForAdmin, controller.deleteRequestByAdmin);

module.exports = router;