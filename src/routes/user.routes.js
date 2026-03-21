const express = require("express");
const router = express.Router();

const { checkUserByPhone } = require("../controllers/user.controller");

router.post("/check-user", checkUserByPhone);

module.exports = router;