const Appointment = require("../models/appointment.model");


// 1️⃣ CREATE APPOINTMENT REQUEST

exports.createAppointment = async (req, res) => {

  try {

    const count = await Appointment.countDocuments();
    const ticketId = `DIGI-APT-${String(count + 1).padStart(6, "0")}`;

    const appointment = new Appointment({
      ...req.body,
      ticketId
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: `Appointment request submitted. Your ticket id is ${ticketId}`,
      ticketId,
      data: appointment
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};



// 2️⃣ FETCH APPOINTMENTS WITH FILTER

exports.getAppointments = async (req, res) => {

  try {

    const { whomToMeet, role, status } = req.query;

    let filter = {};

    if (whomToMeet) filter.whomToMeet = whomToMeet;
    if (role) filter.role = role;
    if (status) filter.status = status;

    const appointments = await Appointment
      .find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: appointments.length,
      data: appointments
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};



// 3️⃣ UPDATE / REJECT / APPROVE / VISITED

exports.updateAppointment = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      status,
      appointmentDate,
      agentName,
      agentPhone
    } = req.body;

    let appointment;
    if (id.startsWith("DIGI-APT-")) {
      appointment = await Appointment.findOneAndUpdate(
        { ticketId: id },
        { status, appointmentDate, agentName, agentPhone },
        { new: true }
      );
    } else {
      appointment = await Appointment.findByIdAndUpdate(
        id,
        { status, appointmentDate, agentName, agentPhone },
        { new: true }
      );
    }

    if (!appointment) {

      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });

    }

    res.status(200).json({
      success: true,
      message: "Appointment updated",
      data: appointment
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};



// 4️⃣ DELETE APPOINTMENTS

exports.deleteAppointments = async (req, res) => {

  try {

    const { ids, type } = req.body;

    if (ids && ids.length > 0) {
      const objectIds = ids.filter(i => typeof i === 'string' && !i.startsWith("DIGI-APT-"));
      const ticketIds = ids.filter(i => typeof i === 'string' && i.startsWith("DIGI-APT-"));

      const orConditions = [];
      if (objectIds.length > 0) orConditions.push({ _id: { $in: objectIds } });
      if (ticketIds.length > 0) orConditions.push({ ticketId: { $in: ticketIds } });

      let filter = {};
      if (orConditions.length > 1) {
        filter.$or = orConditions;
      } else if (orConditions.length === 1) {
        Object.assign(filter, orConditions[0]);
      } else {
        return res.json({ success: false, message: "No valid IDs provided" });
      }

      await Appointment.deleteMany(filter);

      return res.json({
        success: true,
        message: "Selected appointments deleted"
      });
    }

    if (type) {

      await Appointment.deleteMany({
        status: type
      });

      return res.json({
        success: true,
        message: `All ${type} appointments deleted`
      });

    }

    res.json({
      success: false,
      message: "Provide ids or delete type"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};


// 5️⃣ TRACK APPOINTMENT BY TICKET ID
exports.getAppointmentByTicketId = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const appointment = await Appointment.findOne({ ticketId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found with this ticket ID."
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};