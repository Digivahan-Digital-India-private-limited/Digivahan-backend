const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const controller = require("../controllers/reportIssue.controller");
const { upload } = require("../middleware/cloudinary");

router.post(
"/create",
authenticateToken,
upload.array("attachments",5),
controller.createReportIssue
);

router.get("/list", authenticateTokenForAdmin,controller.getReportIssues);

router.put("/update/:id", authenticateTokenForAdmin,controller.updateReportIssue);

router.delete("/delete", authenticateTokenForAdmin,controller.deleteReportIssue);

router.get("/ticket/:ticketId",authenticateToken,controller.getIssueByTicketId);

module.exports = router;