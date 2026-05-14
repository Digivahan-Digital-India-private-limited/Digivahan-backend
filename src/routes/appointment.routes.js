const express = require("express");
const { authenticateToken, authenticateTokenForAdmin } = require("../middleware/auth.js");
const router = express.Router();

const controller = require("../controllers/appointment.controller");

router.post("/create", authenticateToken, controller.createAppointment);

router.get("/list", authenticateTokenForAdmin, controller.getAppointments);

router.put("/update/:id", authenticateTokenForAdmin, controller.updateAppointment);

router.delete("/delete", authenticateTokenForAdmin, controller.deleteAppointments);

router.get("/ticket/:ticketId", authenticateToken, controller.getAppointmentByTicketId);

module.exports = router;