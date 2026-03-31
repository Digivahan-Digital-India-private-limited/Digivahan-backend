const KycModel = require("../models/minikyc.model");
const Payment = require("../models/paymentsRecord.model");
const User = require("../models/User");
const crypto = require("crypto");
const axios = require("axios");

const encryptAadhaar = (aadhaarNumber) => {
  const encryptionKey = Buffer.from("6c338eb8b8d6fde26c338eb8b8d6fde2", "utf8"); // must be 32 bytes

  const ivlen = crypto.getCipherInfo("aes-256-cbc").ivLength;
  const iv = crypto.randomBytes(ivlen);

  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);

  const ciphertext = Buffer.concat([
    cipher.update(aadhaarNumber.toString()),
    cipher.final(),
  ]);

  const encryptedData = Buffer.concat([iv, ciphertext]).toString("base64");

  return encryptedData;
};

const miniKycByAdmin = async (req, res) => {
  try {
    const {
      mobile,
      name,
      gender,
      pan,
      email,
      full,
      city,
      pincode,
      aadhaar,
      dateOfBirth,
    } = req.body;

    const encryptedAadhaar = encryptAadhaar(aadhaar);

    const payload = {
      mobile,
      name,
      gender,
      pan,
      email,
      address: {
        full,
        city,
        pincode,
      },
      aadhaar: encryptedAadhaar,
      dateOfBirth,
      latitude: "28.710631",
      longitude: "77.209942",
    };

    const response = await axios.post(
      "https://api.instantpay.in/user/outlet/signup/minKyc",
      payload,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_LIVE_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
        },
      },
    );

    // 🔥 SAVE TO DB

    if (response.data.statuscode !== "ERR") {
      const savedData = await KycModel.create({
        responseData: response.data,
      });

      return res.status(200).json({
        success: true,
        message: "Fetched & Saved Minikyc data successfully 💫",
        data: savedData,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fetched & Saved Minikyc data successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to Minikyc response 😔",
      error: error.response?.data || error.message,
    });
  }
};

const getbillcategoryByadmin = async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.instantpay.in/marketplace/utilityPayments/category",
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_LIVE_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
          "X-Ipay-Outlet-Id": process.env.OUTLET_ID,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Bill categories fetched successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bill categories 😔",
      error: error.response?.data || error.message,
    });
  }
};

const getBillerlistByUser = async (req, res) => {
  try {
    const { categorykey, pageNumber, recordsPerPage } = req.body;

    const payload = {
      pagination: {
        pageNumber: pageNumber || 1,
        recordsPerPage: recordsPerPage || 100,
      },
      filters: {
        categoryKey: categorykey,
        updatedAfterDate: "",
      },
    };

    const response = await axios.post(
      "https://api.instantpay.in/marketplace/utilityPayments/billers",
      payload,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_LIVE_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
          "X-Ipay-Outlet-Id": process.env.OUTLET_ID,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Billers fetched successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch billers 😔",
      error: error.response?.data || error.message,
    });
  }
};

const getBillerDetailsByUser = async (req, res) => {
  try {
    const { billerId } = req.query;

    const response = await axios.post(
      "https://api.instantpay.in/marketplace/utilityPayments/billerDetails",
      {
        billerId: billerId,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_LIVE_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
          "X-Ipay-Outlet-Id": process.env.OUTLET_ID,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Billers Details fetched successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch billers 😔",
      error: error.response?.data || error.message,
    });
  }
};

const billerEnquiryByuser = async (req, res) => {
  try {
    const { billerId, vehicle_number, phone_number, trans_id } = req.body;

    const payload = {
      billerId: billerId,
      initChannel: "AGT",
      externalRef: trans_id,
      inputParameters: {
        param1: vehicle_number,
      },
      deviceInfo: {
        mac: "BC-BE-33-65-E6-AC",
        ip: "103.254.205.164",
      },
      remarks: {
        param1: phone_number,
      },
    };

    const response = await axios.post(
      "https://api.instantpay.in/marketplace/utilityPayments/prePaymentEnquiry",
      payload,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_LIVE_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
          "X-Ipay-Outlet-Id": process.env.OUTLET_ID,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Billers Enquiry fetched successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch billers Enquiry 😔",
      error: error.response?.data || error.message,
    });
  }
};

const validateBiller = async (req, res) => {
  try {
    const { billerId, vehicle_number, phone_number, trans_id } = req.body;

    const payload = {
      billerId: billerId,
      initChannel: "AGT",
      externalRef: trans_id,
      inputParameters: {
        param1: vehicle_number,
      },
      deviceInfo: {
        mac: "BC-BE-33-65-E6-AC",
        ip: "103.254.205.164",
      },
      remarks: {
        param1: phone_number,
      },
    };

    const response = await axios.post(
      "https://api.instantpay.in/marketplace/utilityPayments/prePaymentEnquiry",
      payload,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_LIVE_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
          "X-Ipay-Outlet-Id": process.env.OUTLET_ID,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Validate Biller fetched successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to validate billers Enquiry 😔",
      error: error.response?.data || error.message,
    });
  }
};

const paymentsService = async (req, res) => {
  try {
    const {
      user_id,
      billerId,
      externalRef,
      enquiryReferenceId,
      vehicle_number,
      mobile,
      transactionAmount,
    } = req.body;

    // 🟡 STEP 1: SAVE INITIAL PAYMENT (INIT)
    const paymentDoc = await Payment.create({
      user_id,
      billerId,
      externalRef,
      enquiryReferenceId,
      vehicle_number,
      mobile,
      transactionAmount,
      status: "INIT",
    });

    // 🟡 STEP 2: UPDATE USER WITH payment_id
    await User.findByIdAndUpdate(
      user_id,
      {
        $push: { paymentId: paymentDoc._id },
      },
      { new: true },
    );

    // 🟡 STEP 3: CREATE PAYLOAD
    const payload = {
      billerId,
      externalRef,
      enquiryReferenceId,
      inputParameters: {
        param1: vehicle_number,
      },
      initChannel: "AGT",
      deviceInfo: {
        terminalId: "12813923",
        mobile: mobile,
        postalCode: "110044",
        geoCode: "28.6326,77.2175",
        ip: "103.254.205.164",
        mac: "BC-BE-33-65-E6-AC",
      },
      paymentMode: "Cash",
      paymentInfo: {
        remarks: "CashPayment",
      },
      remarks: {
        param1: Number(mobile),
      },
      transactionAmount,
    };

    // ⚠️ NOTE: Better use POST instead of GET
    const response = await axios.post(
      "https://api.instantpay.in/marketplace/utilityPayments/payment",
      payload,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Ipay-Auth-Code": "1",
          "X-Ipay-Client-Id": process.env.CLIENT_ID,
          "X-Ipay-Client-Secret": process.env.CLIENT_TEST_SECRET,
          "X-Ipay-Endpoint-Ip": process.env.ENDPOINT_IP,
          "X-Ipay-Outlet-Id": process.env.OUTLET_ID,
        },
      },
    );

    // 🟢 STEP 4: UPDATE SAME PAYMENT DOC WITH RESPONSE
    if (response.data.statuscode === "TXN") {
      await Payment.findByIdAndUpdate(paymentDoc._id, {
        status: "SUCCESS",
        full_payment_details: response.data,
      });
    } else {
      await Payment.findByIdAndUpdate(paymentDoc._id, {
        status: "FAILED",
        full_payment_details: response.data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment done & saved successfully 💫",
      data: response.data,
    });
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    // 🔴 STEP 5: UPDATE STATUS FAILED
    if (req.body.user_id) {
      await Payment.findOneAndUpdate(
        { user_id: req.body.user_id },
        {
          status: "FAILED",
          full_payment_details: error.response?.data || error.message,
        },
        { sort: { createdAt: -1 } },
      );
    }

    return res.status(500).json({
      success: false,
      message: "Payment failed 😔",
      error: error.response?.data || error.message,
    });
  }
};

const getPaymentDeatils = async (req, res) => {
  try {
    const { user_id } = req.params;

    // 🟡 Validate user_id
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required 😔",
      });
    }

    // 🟢 Find all payments of that user
    const payments = await Payment.find({ user_id }).sort({ createdAt: -1 }); // latest first

    // 🔴 If no data found
    if (!payments || payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No payment records found 😔",
      });
    }

    // 🟢 Success response
    return res.status(200).json({
      success: true,
      message: "Payment details fetched successfully 💫",
      total: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get Payment Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment details 😔",
      error: error.message,
    });
  }
};


module.exports = {
  getbillcategoryByadmin,
  getBillerlistByUser,
  getBillerDetailsByUser,
  billerEnquiryByuser,
  validateBiller,
  miniKycByAdmin,
  paymentsService,
  getPaymentDeatils,
};
