const express = require("express");
const router = express.Router();

const controller = require("../controllers/appointment.controller");

router.post("/create", controller.createAppointment);

router.get("/list", controller.getAppointments);

router.put("/update/:id", controller.updateAppointment);

router.delete("/delete", controller.deleteAppointments);

router.get("/ticket/:ticketId", controller.getAppointmentByTicketId);

module.exports = router;