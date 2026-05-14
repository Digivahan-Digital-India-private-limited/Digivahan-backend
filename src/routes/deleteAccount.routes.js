const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");

const router = express.Router();

const controller = require("../controllers/deleteAccount.controller");

router.post("/raise",authenticateToken,controller.raiseDeleteRequest);

router.get("/list", authenticateTokenForAdmin,controller.getDeleteRequests);

router.put("/status/:id", authenticateTokenForAdmin,controller.updateDeleteRequestStatus);

router.get("/status", authenticateToken, controller.getDeleteRequestStatus);

router.delete("/request/:id", authenticateTokenForAdmin, controller.deleteRequestByAdmin);

module.exports = router;