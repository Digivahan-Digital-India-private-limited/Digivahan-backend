const express = require("express");
const router = express.Router();

const controller = require("../controllers/reportIssue.controller");
const { upload } = require("../middleware/cloudinary");

router.post(
"/create",
upload.array("attachments",5),
controller.createReportIssue
);

router.get("/list",controller.getReportIssues);

router.put("/update/:id",controller.updateReportIssue);

router.delete("/delete",controller.deleteReportIssue);

router.get("/ticket/:ticketId",controller.getIssueByTicketId);

module.exports = router;