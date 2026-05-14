const express = require("express");

const router = express.Router();

const controller = require("../controllers/deleteAccount.controller");

router.post("/raise", controller.raiseDeleteRequest);

router.get("/list", controller.getDeleteRequests);

router.put("/status/:id", controller.updateDeleteRequestStatus);

router.get("/status", controller.getDeleteRequestStatus);

router.delete("/request/:id", controller.deleteRequestByAdmin);

module.exports = router;