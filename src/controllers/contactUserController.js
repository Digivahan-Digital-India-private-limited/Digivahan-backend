const axios = require("axios");
const User = require("../models/User");

const contactToUser = async (req, res) => {
  try {
    const { receiver, agent } = req.body;

    if (!receiver || !agent) {
      return res.status(400).json({
        success: false,
        message: "receiver_number and agent_number are required",
      });
    }

    const BULK_CALL_URL = "https://bulksmsplans.com/api/ivr/makeACall";

    // ✅ IMPORTANT: URL encoded body
    const payload = new URLSearchParams({
      api_id: process.env.API_ID,
      api_password: process.env.API_PASSWORD,
      ivr_number: process.env.IVR_NUMBER,
      dial: "agent",
      receiver_number: String(receiver),
      agent_number: String(agent),
    });

    const response = await axios.post(BULK_CALL_URL, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Call initiated successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Bulk call error:", error?.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to initiate call",
      error: error?.response?.data || error.message,
    });
  }
};

const sendSMSNotificationToUser = async (req, res) => {
  try {
    const { user_id, issue_type } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    // 1️⃣ Find user
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Get phone number
    const phone = user?.basic_details?.phone_number;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "User phone number not found",
      });
    }

    // 3️⃣ Get vehicle_id from garage
    const vehicle =
      user?.garage?.vehicles && user.garage.vehicles.length > 0
        ? user.garage.vehicles[0] // 🔥 first vehicle
        : null;

    if (!vehicle?.vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "No vehicle found in user's garage",
      });
    }

    const vehicleId = vehicle.vehicle_id;

    // 4️⃣ Send SMS with vehicle number as template param
    const smsSent = await sendCustomSMS(
      phone,
      issue_type,
      vehicleId, // 👈 pass here
    );

    if (!smsSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send SMS",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      phone,
      vehicle_id: vehicleId,
    });
  } catch (error) {
    console.error("sendSMSNotificationToUser Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const sendCustomSMS = async (phone, templateType = "no_parking", vehicleId) => {
  try {
    // PRP SMS API configuration
    const prpSmsConfig = {
      no_parking: process.env.PRP_SMS_NO_PARKING_TEMPLATE_NAME,
      congested_parking: process.env.PRP_SMS_CONGESTED_PARKING_TEMPLATE_NAME,
      road_block_alert: process.env.PRP_SMS_ROAD_BLOCK_ALERT_TEMPLATE_NAME,
      blocked_vehicle_alert:
        process.env.PRP_SMS_BLOCKED_VEHICLE_ALERT_TEMPLATE_NAME,
      car_lights_windows_left_open:
        process.env.PRP_SMS_LIGHT_OPEN_ALERT_TEMPLATE_NAME,
      car_horn_alarm_going_on: process.env.PRP_SMS_HORN_ALARM_TEMPLATE_NAME,
      unknown_issue_alert: process.env.PRP_SMS_UNKNOWN_ALERT_TEMPLATE_NAME,
      accident_alert: process.env.PRP_SMS_ACCIDENT_ALERT_TEMPLATE_NAME,
    };

    // Get template name based on type
    const templateName = prpSmsConfig[templateType];
    if (!templateName) {
      console.error(`Template name not found for type: ${templateType}`);
      return false;
    }

    const response = await axios.post(
      "https://api.prpsms.biz/BulkSMSapi/keyApiSendSMS/SendSmsTemplateName",
      {
        sender: "DGINDA", // jo DLT me approved ho
        templateName: templateName,
        smsReciever: [
          {
            mobileNo: phone.toString(), // 🔥 string me
            templateParams: vehicleId, // 🔥 SAME as Postman
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json", // 🔥 MUST
          Accept: "application/json",
          apikey: process.env.PRP_SMS_API_KEY,
        },
        timeout: 10000,
      },
    );

    // Check response status
    if (response.data.isSuccess) {
      console.log(`Response:`, response.data);
      return true;
    } else {
      console.error("PRP SMS API error:", response.data);
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS via PRP SMS:", error.message);
    return false;
  }
};

module.exports = { contactToUser, sendSMSNotificationToUser };
