const express = require("express");
const router = express.Router();

const {
  checkUserByPhone,
  getAllUsers,
  getAnalyticsUsers,
  getAnalyticsUserDetail,
  getAnalyticsRtoUsers,
  getAnalyticsRtoUserDetail,
  blockUserByAdmin,
  unblockUserByAdmin,
} = require("../controllers/user.controller");
const { authenticateTokenForAdmin } = require("../middleware/auth.js");

router.post("/check-user", checkUserByPhone);
router.get("/all-users", authenticateTokenForAdmin, getAllUsers);
router.get("/analytics/users", authenticateTokenForAdmin, getAnalyticsUsers);
router.get("/analytics/user/:userId", authenticateTokenForAdmin, getAnalyticsUserDetail);
router.get("/analytics/rto-users", authenticateTokenForAdmin, getAnalyticsRtoUsers);
router.get("/analytics/rto-user/:userId", authenticateTokenForAdmin, getAnalyticsRtoUserDetail);
router.post("/admin/block-user", authenticateTokenForAdmin, blockUserByAdmin);
router.post("/admin/unblock-user", authenticateTokenForAdmin, unblockUserByAdmin);

module.exports = router;
