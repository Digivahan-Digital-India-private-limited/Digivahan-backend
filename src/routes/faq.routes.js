const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const faqController = require("../controllers/faq.controller");

router.post("/add", authenticateTokenForAdmin, faqController.addFAQ);

router.get("/list", faqController.getFAQ);

router.delete("/delete/:id", authenticateTokenForAdmin, faqController.deleteFAQ);

router.put("/update/:id", authenticateTokenForAdmin, faqController.updateFAQ);

module.exports = router;