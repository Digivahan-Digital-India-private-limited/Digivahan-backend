"use strict";

const express = require("express");
const router  = express.Router();

const { API_ROUTES }   = require("../../constants/apiRoutes.js");
const { saveDeviceData } = require("../controllers/deviceController.js");

/**
 * POST /api/device/device_data
 * Register or update device token (FCM + OneSignal) for push notifications.
 */
router.post(API_ROUTES.DEVICE.DEVICE_DATA, saveDeviceData);

module.exports = router;
