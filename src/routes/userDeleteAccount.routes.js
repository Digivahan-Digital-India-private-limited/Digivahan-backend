const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const controller = require("../controllers/userDeleteAccount.controller");

// POST /api/user-account/delete
// Submit a self-service account deletion request
router.post("/delete", authenticateToken, controller.submitDeleteRequest);

// POST /api/user-account/cancel-delete
// Cancel an active self-service account deletion request
router.post("/cancel-delete", authenticateToken, controller.cancelDeleteRequest);

module.exports = router;
