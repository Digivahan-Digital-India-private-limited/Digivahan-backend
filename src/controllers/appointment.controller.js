const Appointment = require("../models/appointment.model");


// 1️⃣ CREATE APPOINTMENT REQUEST

exports.createAppointment = async (req, res) => {

  try {

    const appointment = new Appointment(req.body);

    await appointment.save();

    res.status(201).json({
      success: true,
      message: "Appointment request submitted",
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

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      {
        status,
        appointmentDate,
        agentName,
        agentPhone
      },
      { new: true }
    );

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

      await Appointment.deleteMany({
        _id: { $in: ids }
      });

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