const express = require("express");
const router = express.Router();

const faqController = require("../controllers/faq.controller");

router.post("/add", faqController.addFAQ);

router.get("/list", faqController.getFAQ);

router.delete("/delete/:id", faqController.deleteFAQ);

router.put("/update/:id", faqController.updateFAQ);

module.exports = router;