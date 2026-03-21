const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const Admin = require("../models/admin.model");
const AdminConfig = require("../models/adminConfigSchema");
const Order = require("../models/OrderSchema");
const ShiprocketOrder = require("../models/ShiprocketSchema");
const DeliveryOrder = require("../models/DeliverySchema");
const getISTDateTime = require("../middleware/generateISTDateTime");
const qs = require("qs");

// ------------------------------
// Generate Order Controller
// ------------------------------
const GenerateOrderByUser = async (req, res) => {
  try {
    const {
      user_id,
      order_id,
      active_partner,
      payment_method,
      shipping_mode,
      sub_total,
      order_value,
      declared_value,
      shipping_is_billing,
      shipping,
      billing,
      parcel,
      order_items,
    } = req.body;

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const order = await Order.create({
      user_id: user._id,

      order_id: order_id,

      active_partner: active_partner,

      payment_method: payment_method,

      shipping_mode: shipping_mode || "Surface",

      sub_total: sub_total,

      order_value: order_value,

      declared_value: declared_value,

      shipping_is_billing: shipping_is_billing,

      courier_company_id: req.body.courier_company_id, // ✅ ADD THIS

      courier_name: req.body.courier_name,

      shipping: {
        first_name: shipping.first_name,

        last_name: shipping.last_name,

        phone: shipping.phone,

        email: shipping.email,

        address1: shipping.address1,

        address2: shipping.address2,

        city: shipping.city,

        state: shipping.state,

        country: shipping.country,

        pincode: shipping.pincode,
      },

      billing: {
        first_name: billing.first_name,

        last_name: billing.last_name,

        phone: billing.phone,

        address1: billing.address1,

        address2: billing.address2,

        city: billing.city,

        state: billing.state,

        country: billing.country,

        pincode: billing.pincode,
      },

      parcel: {
        length: parcel.length,

        breadth: parcel.breadth,

        height: parcel.height,

        weight: parcel.weight,
      },

      order_items: order_items.map((item) => ({
        vehicle_id: item.vehicle_id,

        order_type: item.order_type,

        name: item.name,

        sku: item.sku,

        units: item.units,

        selling_price: item.selling_price,

        selling_price_currency: item.selling_price_currency,

        weight: item.weight,
      })),
    });

    await User.findByIdAndUpdate(user._id, {
      $push: { my_orders: order._id },
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new_order_created", order);
    } else {
      console.log("⚠️ Socket IO not initialized");
    }

    return res.status(201).json({
      status: true,

      message: "Order created successfully",

      data: order,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: false,

      message: err.message,
    });
  }
};

const ConfirmOrderByAdmin = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id)
      return res.status(400).json({
        status: false,
        message: "order_id required",
      });

    /* ----------------------------------------
       STEP 1: FETCH ORDER
    ---------------------------------------- */

    const order = await Order.findById(order_id);

    if (!order)
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });

    /* ----------------------------------------
       STEP 2: PREVENT DUPLICATE CREATION
    ---------------------------------------- */

    if (order.partner_order_created)
      return res.status(400).json({
        status: false,
        message: "Partner order already created",
      });

    /* ----------------------------------------
       STEP 3: CHECK ACTIVE PARTNER
    ---------------------------------------- */

    if (order.active_partner === "shiprocket") {
      /* ----------------------------------------
         BUILD SHIPROCKET PAYLOAD
      ---------------------------------------- */

      const orderItemsPayload = order.order_items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.selling_price,
        selling_price_currency: item.selling_price_currency,
        weight: item.weight,
      }));

      orderItemsPayload.push({
        name: "Delivery Charges",
        sku: "SHIP-001",
        units: 1,
        selling_price: order.sub_total,
        selling_price_currency: "INR",
      });

      const shiprocketPayload = {
        order_id: order.order_id,

        order_date: order.order_date,

        sub_total: order.sub_total,

        order_value: order.order_value,

        payment_method: order.payment_method,

        is_prepared: order.is_prepared,

        shipping_is_billing: order.shipping_is_billing,

        is_return: order.is_return,

        declared_value: order.declared_value,

        shipping_customer_name: order.shipping.first_name,

        shipping_last_name: order.shipping.last_name,

        shipping_phone: order.shipping.phone,

        shipping_address: order.shipping.address1,

        shipping_address_2: order.shipping.address2,

        shipping_city: order.shipping.city,

        shipping_state: order.shipping.state,

        shipping_country: order.shipping.country,

        shipping_pincode: order.shipping.pincode,

        shipping_email: order.shipping.email,

        billing_customer_name: order.billing.first_name,

        billing_last_name: order.billing.last_name,

        billing_phone: order.billing.phone,

        billing_address: order.billing.address1,

        billing_address_2: order.billing.address2,

        billing_city: order.billing.city,

        billing_state: order.billing.state,

        billing_country: order.billing.country,

        billing_pincode: order.billing.pincode,

        length: order.parcel.length,

        breadth: order.parcel.breadth,

        height: order.parcel.height,

        weight: order.parcel.weight,

        order_items: orderItemsPayload,
      };

      /* ----------------------------------------
         CREATE SHIPROCKET ORDER
      ---------------------------------------- */

      const response = await createShiprocketOrder(shiprocketPayload);

      if (!response?.shipment_id)
        throw new Error("Shiprocket order creation failed");

      const AWBpayload = {
        shipment_id: String(response.shipment_id),
        courier_company_id: order.courier_company_id,
      };
      

      const awbResponse = await GenerateAWBShipment(AWBpayload);

      if (!awbResponse?.response?.data?.awb_code) {
        throw new Error("AWB generation failed");
      }

      /* ------------------------------------------------
       STEP 6: GENERATE PICKUP 
       ------------------------------------------------ */
      const pickupResponse = await GenerateShiprocketPickUp([
        response.shipment_id,
      ]);

      /* ----------------------------------------
         SAVE INTO ShiprocketOrder COLLECTION
      ---------------------------------------- */

      await ShiprocketOrder.create({
        order_id: order._id,

        channel_order_id: order.order_id,

        shiprocket_order_id: response.order_id,

        shipment_id: response.shipment_id,

        awb_code: awbResponse.response.data.awb_code || "",

        onboarding_completed_now: response.onboarding_completed_now,

        courier_company_id: order.courier_company_id,

        courier_name: order.courier_name,

        status: response.status,

        status_code: response.status_code,
        new_channel: response.new_channel,
        packaging_box_error: response.packaging_box_error,
        awb_data: awbResponse,
        pickup_data: pickupResponse,
      });

      /* ----------------------------------------
         UPDATE ORDER COLLECTION
      ---------------------------------------- */

      order.partner_order_created = true;

      order.order_status = "CONFIRMED";
      order.is_prepared = true;

      await order.save();
    } else if (order.active_partner === "delivery") {
      /* ----------------------------------------
       BUILD DELIVERY PAYLOAD
    ---------------------------------------- */

      const Deliverypayload = {
        shipments: [
          {
            name: `${order.shipping.first_name} ${order.shipping.last_name}`,

            add: `${order.shipping.address1} ${order.shipping.address2}`,

            pin: order.shipping.pincode,

            city: order.shipping.city,

            state: order.shipping.state,

            country: order.shipping.country,

            phone: order.shipping.phone,

            order: order.order_id,

            payment_mode: order.payment_method,

            shipment_width: order.parcel.breadth?.toString() || "10",

            shipment_height: order.parcel.height?.toString() || "5",

            shipping_mode: order.shipping_mode || "Surface",
          },
        ],

        pickup_location: {
          name: "DIGIVAHAN",
        },
      };

      /* ----------------------------------------
       CREATE DELIVERY ORDER
    ---------------------------------------- */

      const response = await createDeliveryOrder(Deliverypayload);

      console.log(response);

      /* ----------------------------------------
       VALIDATE RESPONSE
    ---------------------------------------- */

      if (!response?.success || !response?.packages?.length) {
        throw new Error("Delivery order creation failed");
      }

      const packageData = response.packages[0];

      const { date, time } = getISTDateTime(2); // add 2 hours

      const pickupPayload = {
        pickup_date: date,

        pickup_time: time,

        pickup_location: "DIGIVAHAN",

        expected_package_count: 1,
      };

      const deliveryPickupresponse =
        await GenerateDeliveryPickup(pickupPayload);

      // console.log(deliveryPickupresponse);

      /* ----------------------------------------
       SAVE INTO DeliveryOrder COLLECTION
    ---------------------------------------- */

      await DeliveryOrder.create({
        order_id: order._id,

        waybill: packageData.waybill,

        reference_number: packageData.refnum,

        client: packageData.client,

        payment_mode: packageData.payment,

        status: packageData.status,

        sort_code: packageData.sort_code,

        serviceable: packageData.serviceable,

        remarks: packageData.remarks,

        replacement_count: response.replacement_count,

        cash_pickups: response.cash_pickups,

        cod_amount: response.cod_amount,

        upload_wbn: response.upload_wbn,

        package_count: response.package_count,

        prepaid_count: response.prepaid_count,

        cod_count: response.cod_count,

        cash_pickups_count: response.cash_pickups_count,

        pickups_count: response.pickups_count,

        pickup_data: deliveryPickupresponse,
      });

      /* ----------------------------------------
       UPDATE ORDER COLLECTION
    ---------------------------------------- */

      order.partner_order_created = true;

      order.order_status = "CONFIRMED";

      order.is_prepared = true;

      await order.save();
    }

    /* ----------------------------------------
       SUCCESS RESPONSE
    ---------------------------------------- */

    const io = req.app.get("io");

    if (io) {
      io.emit("order_confirmed", order);
    }

    return res.status(200).json({
      status: true,
      message: "Order confirmed successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ------------------------------
// Shiprocket Order API Function
// ------------------------------
const createShiprocketOrder = async (payload) => {
  try {
    const response = await axios.post(
      `https://apiv2.shiprocket.in/v1/external/orders/create/adhoc`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.log("Shiprocket API Error:", error?.response?.data);
    return null;
  }
};

// ------------------------------
// Generate AWB Shipment API Function
// ------------------------------
const GenerateAWBShipment = async (payload) => {
  try {
    const url = "https://apiv2.shiprocket.in/v1/external/courier/assign/awb";

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
      },
    });

    // 👉 PURE SHIPROCKET RESPONSE RETURN
    return response.data;
  } catch (error) {
    console.error(
      "GenerateAWBShipment Error:",
      error?.response?.data || error.message,
    );

    throw {
      message: "Failed to generate AWB",
      error: error?.response?.data || error.message,
    };
  }
};

// ------------------------------
// Generate Pickup API Function on shiprocket
// ------------------------------
const GenerateShiprocketPickUp = async (payload) => {
  try {
    const url =
      "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup";

    const response = await axios.post(
      url,
      {
        shipment_id: payload,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
        },
      },
    );

    // 🔥 FULL RESPONSE AS-IT-IS
    return response.data;
  } catch (error) {
    console.error(
      "GeneratePickUp Error:",
      error?.response?.data || error.message,
    );

    throw {
      message: "Failed to generate pickup",
      error: error?.response?.data || error.message,
    };
  }
};

// ------------------------------
// Delivery Order API Function
// ------------------------------
const createDeliveryOrder = async (payload) => {
  try {
    if (!payload) {
      throw new Error("Delivery payload is required");
    }

    /* ----------------------------------
       CONVERT TO x-www-form-urlencoded
    ----------------------------------- */

    const formData = qs.stringify({
      format: "json",

      data: JSON.stringify(payload),
    });

    /* ----------------------------------
       CALL DELHIVERY API
    ----------------------------------- */

    const response = await axios.post(
      "https://track.delhivery.com/api/cmu/create.json",

      formData,

      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",

          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        },
      },
    );

    /* ----------------------------------
       RETURN RESPONSE
    ----------------------------------- */

    return response.data;
  } catch (error) {
    console.error(
      "Delhivery Order Create Error:",
      error?.response?.data || error.message,
    );

    throw new Error(
      error?.response?.data?.message || "Failed to create Delhivery order",
    );
  }
};

// ------------------------------
// Generate Pickup API Function on Delivery
// ------------------------------
const GenerateDeliveryPickup = async (pickupPayload) => {
  try {
    if (!pickupPayload) {
      throw new Error("Pickup payload is required");
    }

    /* ----------------------------------
       CALL DELHIVERY PICKUP API
    ----------------------------------- */

    const response = await axios.post(
      "https://track.delhivery.com/fm/request/new/",

      pickupPayload, // ✅ send direct JSON

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        },
      },
    );

    /* ----------------------------------
       RETURN RESPONSE
    ----------------------------------- */

    return response.data;
  } catch (error) {
    console.error(
      "Delhivery Pickup Error:",
      error?.response?.data || error.message,
    );

    throw new Error(
      error?.response?.data?.message || "Failed to create Delhivery pickup",
    );
  }
};

// ------------------------------
// Generate Manifest API Function
// ------------------------------

const GenerateOrderManifest = async (req, res) => {
  try {
    const { order_id } = req.params;

    /* 1️⃣ Validate */
    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "order_id is required",
      });
    }

    /* 2️⃣ Find Shiprocket Order */
    const shiprocketOrder = await ShiprocketOrder.findOne({
      order_id: order_id,
    });

    if (!shiprocketOrder) {
      return res.status(404).json({
        status: false,
        message: "Shiprocket order not found",
      });
    }

    /* 3️⃣ Prevent manifest for canceled shipment */
    if (shiprocketOrder.status === "CANCELED") {
      return res.status(400).json({
        status: false,
        message: "Manifest cannot be generated for canceled shipment",
      });
    }

    /* 4️⃣ Check shipment_id */
    if (!shiprocketOrder.shipment_id) {
      return res.status(400).json({
        status: false,
        message: "Shipment ID not found",
      });
    }

    /* 5️⃣ Prevent duplicate manifest */
    if (shiprocketOrder.manifest_url) {
      return res.status(200).json({
        status: true,
        message: "Manifest already generated",
        data: {
          order_id: shiprocketOrder.order_id,
          shipment_id: shiprocketOrder.shipment_id,
          manifest_url: shiprocketOrder.manifest_url,
        },
      });
    }

    /* 6️⃣ Call Shiprocket API */
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/manifests/generate",
      {
        shipment_id: [shiprocketOrder.shipment_id],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    const manifestUrl = response?.data?.manifest_url;

    if (!manifestUrl) {
      return res.status(500).json({
        status: false,
        message: "Manifest generation failed",
        shiprocket_response: response.data,
      });
    }

    /* 7️⃣ Update ShiprocketOrder Schema */
    shiprocketOrder.manifest_url = manifestUrl;

    shiprocketOrder.manifest_generated_at = new Date();

    await shiprocketOrder.save();

    /* 8️⃣ Success */
    return res.status(200).json({
      status: true,
      message: "Manifest generated successfully",
      data: {
        order_id: shiprocketOrder.order_id,
        shipment_id: shiprocketOrder.shipment_id,
        manifest_url: manifestUrl,
      },
    });
  } catch (error) {
    console.error(
      "GenerateOrderManifest Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Failed to generate manifest",
      error: error?.response?.data || error.message,
    });
  }
};

const PrintBulkManifest = async (req, res) => {
  try {
    const { order_ids } = req.body;

    /* 1️⃣ Validate */
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        status: false,
        message: "order_ids array is required",
      });
    }

    /* 2️⃣ Find Shiprocket Orders */
    const shiprocketOrders = await ShiprocketOrder.find({
      order_id: { $in: order_ids },
    }).select("order_id shipment_id status");

    if (!shiprocketOrders.length) {
      return res.status(404).json({
        status: false,
        message: "No Shiprocket orders found",
      });
    }

    /* 3️⃣ Extract valid shipment_ids */
    const shipmentIds = [];
    const skippedOrders = [];

    for (const order of shiprocketOrders) {
      if (order.status === "CANCELED") {
        skippedOrders.push({
          order_id: order.order_id,
          reason: "Shipment canceled",
        });
        continue;
      }

      if (!order.shipment_id) {
        skippedOrders.push({
          order_id: order.order_id,
          reason: "Shipment ID missing",
        });
        continue;
      }

      shipmentIds.push(order.shipment_id);
    }

    if (!shipmentIds.length) {
      return res.status(400).json({
        status: false,
        message: "No valid shipment IDs found",
        skippedOrders,
      });
    }

    /* 4️⃣ Call Shiprocket Manifest API */
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/manifests/generate",
      {
        shipment_id: shipmentIds, // 🔥 Bulk array
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    const manifestUrl = response?.data?.manifest_url;

    if (!manifestUrl) {
      return res.status(500).json({
        status: false,
        message: "Manifest generation failed",
        shiprocket_response: response.data,
      });
    }

    /* 5️⃣ Just Return Manifest URL (No DB Update) */
    return res.status(200).json({
      status: true,
      message: "Manifest generated successfully",
      data: {
        manifest_url: manifestUrl,
        total_shipments: shipmentIds.length,
        skipped_orders: skippedOrders,
      },
    });
  } catch (error) {
    console.error(
      "PrintBulkManifest Error:",
      error?.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      status: false,
      message: error.response?.data?.message || "Failed to generate manifest",
      error: error.response?.data || error.message,
    });
  }
};

// ------------------------------
// Generate Lable API Function
// ------------------------------

const GenerateShiprocketLabel = async (req, res) => {
  try {
    const { order_id } = req.params;

    /* -----------------------------
       1️⃣ VALIDATION
    ----------------------------- */

    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "order_id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid order_id",
      });
    }

    /* -----------------------------
       2️⃣ FIND ORDER
    ----------------------------- */

    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    if (order.active_partner !== "shiprocket") {
      return res.status(400).json({
        status: false,
        message: "This order is not created with Delivery partner",
      });
    }

    /* 2️⃣ Find ShiprocketOrder */
    const shiprocketOrder = await ShiprocketOrder.findOne({
      order_id: order_id,
    });

    if (!shiprocketOrder) {
      return res.status(404).json({
        status: false,
        message: "Shiprocket order not found",
      });
    }

    /* 4️⃣ Check shipment_id exists */
    if (!shiprocketOrder.shipment_id) {
      return res.status(400).json({
        status: false,
        message: "Shipment ID not found. Generate shipment first.",
      });
    }

    /* 5️⃣ Prevent duplicate label generation */
    if (shiprocketOrder.label_url) {
      return res.status(200).json({
        status: true,
        message: "Label already generated",
        data: {
          order_id: shiprocketOrder.order_id,
          shipment_id: shiprocketOrder.shipment_id,
          label_url: shiprocketOrder.label_url,
        },
      });
    }

    /* 6️⃣ Call Shiprocket Label API */
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/generate/label",
      {
        shipment_id: [shiprocketOrder.shipment_id],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    /* 7️⃣ Extract label URL */
    const labelUrl =
      response?.data?.label_url || response?.data?.response?.label_url;

    if (!labelUrl) {
      return res.status(500).json({
        status: false,
        message: "Label generation failed",
        shiprocket_response: response.data,
      });
    }

    /* 8️⃣ Save in ShiprocketOrder collection */
    shiprocketOrder.label_url = labelUrl;

    shiprocketOrder.label_generated_at = new Date();

    await shiprocketOrder.save();

    /* 9️⃣ Success response */
    return res.status(200).json({
      status: true,
      message: "Label generated successfully",
      data: {
        order_id: shiprocketOrder.order_id,
        shipment_id: shiprocketOrder.shipment_id,
        label_url: labelUrl,
      },
    });
  } catch (error) {
    console.error(
      "GenerateLabel Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Failed to generate label",
      error: error?.response?.data || error.message,
    });
  }
};

const GenerateDeliveryLabel = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "order_id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid order_id",
      });
    }

    /* 1️⃣ Find Order */
    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    if (order.active_partner !== "delivery") {
      return res.status(400).json({
        status: false,
        message: "This order is not created with Delivery partner",
      });
    }

    /* 2️⃣ Find Delivery Order */
    const deliveryOrder = await DeliveryOrder.findOne({
      order_id: order._id,
    });

    if (!deliveryOrder?.waybill) {
      return res.status(404).json({
        status: false,
        message: "Waybill not found",
      });
    }

    // If already generated
    if (deliveryOrder.label_url) {
      return res.status(200).json({
        status: true,
        message: "Label already generated",
        data: {
          order_id: deliveryOrder.order_id,
          shipment_id: deliveryOrder.waybill,
          label_url: deliveryOrder.label_url,
        },
      });
    }

    /* 3️⃣ Call Delhivery API */
    const response = await axios.get(
      "https://track.delhivery.com/api/p/packing_slip",
      {
        params: {
          wbns: deliveryOrder.waybill,
          pdf: true,
          pdf_size: "",
        },
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
          Accept: "application/json",
        },
      },
    );

    // 🔥 IMPORTANT FIX
    const labelUrl = response?.data?.packages?.[0]?.pdf_download_link;

    if (!labelUrl) {
      return res.status(400).json({
        status: false,
        message: "Failed to generate label",
        error: response.data,
      });
    }

    /* 4️⃣ Save in DB */
    deliveryOrder.label_url = labelUrl;
    deliveryOrder.label_generated_at = new Date();
    await deliveryOrder.save();

    /* 5️⃣ Return Response */
    return res.status(200).json({
      status: true,
      message: "Label generated successfully",
      data: {
        order_id: deliveryOrder.order_id,
        shipment_id: deliveryOrder.waybill,
        label_url: labelUrl,
      },
    });
  } catch (error) {
    console.error(
      "GenerateDeliveryLabel Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Failed to generate delivery label",
      error: error?.response?.data || error.message,
    });
  }
};

// ------------------------------
// Get All Order From user My-order node
// ------------------------------
const getUserAllOrder = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    // Verify user exists
    const userExists = await User.exists({ _id: user_id });

    if (!userExists) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Fetch orders directly from Order schema
    const orders = await Order.find({ user_id })
      .sort({ createdAt: -1 }) // latest first
      .lean(); // faster performance

    return res.status(200).json({
      status: true,
      message: "User orders fetched successfully",
      total: orders.length,
      orders,
    });
  } catch (error) {
    console.error("getUserAllOrder Error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// Find Single Order Details
// ------------------------------
const findSingleOrderData = async (req, res) => {
  try {
    const { user_id, order_id } = req.body;

    // Validate input
    if (!user_id || !order_id) {
      return res.status(400).json({
        status: false,
        message: "user_id and order_id are required",
      });
    }

    // Find order directly from Order schema
    const order = await Order.findOne({
      _id: order_id,
      user_id: user_id,
    }).lean();

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found for this user",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Order details fetched successfully",
      order,
    });
  } catch (error) {
    console.error("findSingleOrderData Error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// Get Order Details By Admin
// --
const findOrderByAdminThrowOrderId = async (req, res) => {
  try {
    const { order_id } = req.body;

    /* -----------------------------
       1️⃣ Validate input
    ----------------------------- */

    if (!order_id || typeof order_id !== "string") {
      return res.status(400).json({
        status: false,
        message: "Valid order_id is required",
      });
    }

    /* -----------------------------
       2️⃣ Find order
    ----------------------------- */

    const order = await Order.findOne({ order_id }, {}, { lean: true });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    let partnerDetails = null;

    /* =====================================================
       🚀 SHIPROCKET FLOW
    ===================================================== */

    if (order.active_partner === "shiprocket") {
      partnerDetails = await ShiprocketOrder.findOne(
        { order_id: order._id },
        {},
        { lean: true },
      );
    } else if (order.active_partner === "delivery") {
      /* =====================================================
       🚚 DELIVERY FLOW
    ===================================================== */
      partnerDetails = await DeliveryOrder.findOne(
        { order_id: order._id },
        {},
        { lean: true },
      );
    }

    /* -----------------------------
       3️⃣ Final Response
    ----------------------------- */

    return res.status(200).json({
      status: true,
      message: "Order fetched successfully",
      data: {
        order: order,
        partner: partnerDetails || null,
      },
    });
  } catch (error) {
    console.error("findOrderByAdminThrowOrderId Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ------------------------------
// Get All Order by userId Order node
// --

const findOrderByAdminThrowUserId = async (req, res) => {
  try {
    const { user_id, page = 1, limit = 20 } = req.body;

    /* -----------------------------
       1️⃣ VALIDATION
    ----------------------------- */

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user_id",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(user_id);

    const user = await User.findById(userObjectId).lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    /* -----------------------------
       2️⃣ PAGINATION
    ----------------------------- */

    const skip = (page - 1) * limit;

    const orders = await Order.find({ user_id: userObjectId }, null, {
      sort: { createdAt: -1 },
      skip,
      limit,
      lean: true,
    });

    const totalOrders = await Order.countDocuments({
      user_id: userObjectId,
    });

    /* -----------------------------
       3️⃣ SEPARATE BY PARTNER
    ----------------------------- */

    const shiprocketIds = [];
    const deliveryIds = [];

    orders.forEach((order) => {
      if (!order.partner_order_created) return;

      if (order.active_partner === "shiprocket") {
        shiprocketIds.push(order._id);
      }

      if (order.active_partner === "delivery") {
        deliveryIds.push(order._id);
      }
    });

    /* -----------------------------
       4️⃣ FETCH PARTNER DATA IN BULK
    ----------------------------- */

    const [shiprocketOrders, deliveryOrders] = await Promise.all([
      shiprocketIds.length
        ? ShiprocketOrder.find({ order_id: { $in: shiprocketIds } }, null, {
            lean: true,
          })
        : [],

      deliveryIds.length
        ? DeliveryOrder.find({ order_id: { $in: deliveryIds } }, null, {
            lean: true,
          })
        : [],
    ]);

    /* -----------------------------
       5️⃣ CREATE MAPS (FAST LOOKUP)
    ----------------------------- */

    const shiprocketMap = {};
    const deliveryMap = {};

    shiprocketOrders.forEach((sr) => {
      shiprocketMap[sr.order_id.toString()] = sr;
    });

    deliveryOrders.forEach((dl) => {
      deliveryMap[dl.order_id.toString()] = dl;
    });

    /* -----------------------------
       6️⃣ MERGE DATA
    ----------------------------- */

    const finalOrders = orders.map((order) => {
      let partnerDetails = null;

      if (order.active_partner === "shiprocket") {
        partnerDetails = shiprocketMap[order._id.toString()] || null;
      }

      if (order.active_partner === "delivery") {
        partnerDetails = deliveryMap[order._id.toString()] || null;
      }

      return {
        order,
        partner_details: partnerDetails,
      };
    });

    /* -----------------------------
       7️⃣ RESPONSE
    ----------------------------- */

    return res.status(200).json({
      status: true,

      message: "Orders fetched successfully",

      pagination: {
        total: totalOrders,
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(totalOrders / limit),
      },

      data: finalOrders,
    });
  } catch (error) {
    console.error("findOrderByAdminThrowUserId Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ------------------------------
// Get All New Order list to Admin
// --
const GetAllNewOrderListToAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.body;

    // pagination calculation
    const skip = (page - 1) * limit;

    // fetch NEW orders
    const orders = await Order.find({ order_status: "NEW" }, null, {
      sort: { createdAt: -1 }, // latest first
      skip: skip,
      limit: Number(limit),
      lean: true, // improves performance
    }).populate({
      path: "user_id",
      select: "name email phone", // optional user info
    });

    // total count
    const total = await Order.countDocuments({
      order_status: "NEW",
    });

    return res.status(200).json({
      status: true,
      message: "New orders fetched successfully",

      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(total / limit),
      },

      data: orders,
    });
  } catch (error) {
    console.error("GetAllNewOrderListToAdmin Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch new orders",
      error: error.message,
    });
  }
};

// ------------------------------
// This apis only hit by user
const OrderCancelByUser = async (req, res) => {
  try {
    const { order_id, user_id } = req.body;

    /* -----------------------------
       1️⃣ Validate input
    ----------------------------- */

    if (!order_id || !user_id) {
      return res.status(400).json({
        status: false,
        message: "order_id and user_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(order_id) ||
      !mongoose.Types.ObjectId.isValid(user_id)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid order_id or user_id",
      });
    }

    /* -----------------------------
       2️⃣ Find Order
    ----------------------------- */

    const order = await Order.findOne({
      _id: order_id,
      user_id: user_id,
    });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    /* -----------------------------
       3️⃣ Already canceled check
    ----------------------------- */

    if (order.order_status === "CANCELED") {
      return res.status(400).json({
        status: false,
        message: "Order already canceled",
      });
    }

    /* -----------------------------
       4️⃣ If prepared, check shipment
    ----------------------------- */

    if (order.is_prepared === true) {
      return res.status(400).json({
        status: false,
        message: "Order already prepared, cannot cancel",
      });
    }

    /* -----------------------------
       5️⃣ Cancel order (allowed)
    ----------------------------- */

    order.order_status = "CANCELED";

    order.canceled_at = new Date();

    await order.save();

    /* -----------------------------
       6️⃣ Success response
    ----------------------------- */

    return res.status(200).json({
      status: true,
      message: "Order canceled successfully",
      data: order,
    });
  } catch (error) {
    console.error("OrderCancelByUser Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ------------------------------
// Order Cancel By Admin
// ------------------------------
const OrderCancelByAdmin = async (req, res) => {
  try {
    const { order_id } = req.body;

    /* -----------------------------
       1️⃣ VALIDATION
    ----------------------------- */

    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "order_id is required",
      });
    }

    /* -----------------------------
       2️⃣ FIND ORDER USING order_id FIELD
    ----------------------------- */

    const order = await Order.findOne({ order_id: order_id });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    if (order.order_status === "CANCELED") {
      return res.status(400).json({
        status: false,
        message: "Order already canceled",
      });
    }

    let partnerResponse = null;

    /* =====================================================
       🚀 SHIPROCKET FLOW
    ===================================================== */

    if (order.active_partner === "shiprocket") {
      const shiprocketOrder = await ShiprocketOrder.findOne({
        order_id: order._id, // relation still by ObjectId internally
      });

      if (!shiprocketOrder?.shiprocket_order_id) {
        return res.status(400).json({
          status: false,
          message: "Shiprocket order not found",
        });
      }

      partnerResponse = await cancelShiprocketOrder(
        shiprocketOrder.shiprocket_order_id,
      );

      if (!partnerResponse) {
        return res.status(400).json({
          status: false,
          message: "Shiprocket cancellation failed",
        });
      }

      shiprocketOrder.status = "CANCELED";
      shiprocketOrder.canceled_at = new Date();
      await shiprocketOrder.save();
    } else if (order.active_partner === "delivery") {
      /* =====================================================
       🚚 DELIVERY FLOW
    ===================================================== */
      const deliveryOrder = await DeliveryOrder.findOne({
        order_id: order._id,
      });

      if (!deliveryOrder?.waybill) {
        return res.status(400).json({
          status: false,
          message: "Delivery order not found",
        });
      }

      partnerResponse = await cancelDeliveryShipment(deliveryOrder.waybill);

      if (!partnerResponse?.status) {
        return res.status(400).json({
          status: false,
          message: "Delivery cancellation failed",
        });
      }

      deliveryOrder.status = "CANCELED";
      deliveryOrder.canceled_at = new Date();
      await deliveryOrder.save();
    }

    /* -----------------------------
       3️⃣ UPDATE MAIN ORDER
    ----------------------------- */

    order.order_status = "CANCELED";
    order.canceled_at = new Date();
    await order.save();

    /* -----------------------------
       4️⃣ SUCCESS RESPONSE
    ----------------------------- */

    return res.status(200).json({
      status: true,
      message: "Order canceled successfully",
      data: {
        order_id: order.order_id, // returning business id
        active_partner: order.active_partner,
        partner_response: partnerResponse,
      },
    });
  } catch (error) {
    console.error(
      "OrderCancelByAdmin Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

// Ship Rocket cancel order apis
const cancelShiprocketOrder = async (orderId) => {
  try {
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/cancel",
      {
        ids: [orderId],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket cancel order error:",
      error?.response?.data || error.message,
    );
    throw error;
  }
};

// Delivery cancel order apis
const cancelDeliveryShipment = async (waybill) => {
  try {
    if (!waybill) {
      throw new Error("Waybill is required for cancellation");
    }

    /* ----------------------------------
       BUILD PAYLOAD
    ----------------------------------- */

    const payload = {
      waybill: waybill,

      cancellation: "true",
    };

    /* ----------------------------------
       CALL DELHIVERY CANCEL API
    ----------------------------------- */

    const response = await axios.post(
      "https://track.delhivery.com/api/p/edit",

      payload,

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        },
      },
    );

    /* ----------------------------------
       VALIDATE RESPONSE
    ----------------------------------- */

    if (!response?.data) {
      throw new Error("Delhivery cancellation failed");
    }

    /* ----------------------------------
       RETURN RESPONSE
    ----------------------------------- */

    return response.data;
  } catch (error) {
    console.error(
      "Delhivery Cancel Shipment Error:",
      error?.response?.data || error.message,
    );

    throw new Error(
      error?.response?.data?.message || "Failed to cancel Delhivery shipment",
    );
  }
};

// Track Order Status
const TrackOrderwithOrderId = async (req, res) => {
  try {
    const { order_id } = req.body;

    /* -----------------------------
       1️⃣ VALIDATION
    ----------------------------- */

    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "order_id is required",
      });
    }

    /* -----------------------------
       2️⃣ FIND ORDER USING BUSINESS order_id
    ----------------------------- */

    const order = await Order.findOne({ order_id });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    if (!order.partner_order_created) {
      return res.status(400).json({
        status: false,
        message: "Order not confirmed yet",
      });
    }

    let shipmentStatus = "UNKNOWN";
    let partnerResponse = null;
    let Tracking_Link = "";

    /* =====================================================
       🚀 SHIPROCKET FLOW
    ===================================================== */

    if (order.active_partner === "shiprocket") {
      const shiprocketOrder = await ShiprocketOrder.findOne({
        order_id: order._id, // relation via Mongo _id (correct)
      });

      if (!shiprocketOrder?.shiprocket_order_id) {
        return res.status(400).json({
          status: false,
          message: "Shiprocket order id not found",
        });
      }

      partnerResponse = await trackShiprocketOrder(
        shiprocketOrder.shiprocket_order_id,
      );

      const shipment = partnerResponse?.data?.shipments?.[0] || {};

      shipmentStatus =
        shipment?.current_status ||
        partnerResponse?.data?.status ||
        shiprocketOrder.status ||
        "UNKNOWN";

      shiprocketOrder.status = shipmentStatus;
      shiprocketOrder.tracking_data = partnerResponse;
      shiprocketOrder.last_tracked_at = new Date();
      await shiprocketOrder.save();
    } else if (order.active_partner === "delivery") {
      /* =====================================================
       🚚 DELIVERY FLOW
    ===================================================== */
      const deliveryOrder = await DeliveryOrder.findOne({
        order_id: order._id,
      });

      if (!deliveryOrder?.waybill) {
        return res.status(400).json({
          status: false,
          message: "Delivery order not found",
        });
      }

      partnerResponse = await trackDeliveryOrder(deliveryOrder.waybill);

      const shipmentData = partnerResponse?.ShipmentData?.[0]?.Shipment || {};

      const scans = shipmentData?.Scans || [];

      const lastScan =
        scans.length > 0 ? scans[scans.length - 1]?.ScanDetail : null;

      const scanType = lastScan?.ScanType || shipmentData?.Status?.StatusType;

      const statusMap = {
        UD: "IN_TRANSIT",
        DL: "DELIVERED",
        RT: "RETURNED",
        CN: "CANCELED",
        PU: "PICKED_UP",
      };

      shipmentStatus = statusMap[scanType] || deliveryOrder.status || "UNKNOWN";

      deliveryOrder.status = shipmentStatus;
      deliveryOrder.tracking_data = partnerResponse;
      deliveryOrder.tracking_url = `https://www.delhivery.com/track-v2/package/${deliveryOrder.waybill}`;
      deliveryOrder.last_tracked_at = new Date();
      Tracking_Link = `https://www.delhivery.com/track-v2/package/${deliveryOrder.waybill}`;

      await deliveryOrder.save();
    }

    /* -----------------------------
       UPDATE MAIN ORDER COLLECTION
    ----------------------------- */

    order.order_status = shipmentStatus;
    order.last_tracked_at = new Date();

    await order.save();

    /* -----------------------------
       SUCCESS RESPONSE
    ----------------------------- */

    return res.status(200).json({
      status: true,
      message: "Order tracked successfully",
      data: {
        order_id: order.order_id, // return business id
        active_partner: order.active_partner,
        shipment_status: shipmentStatus,
        owner_name: `${order.shipping.first_name} ${order.shipping.last_name}`,
        vehicle_number: order.order_items[0].vehicle_id,
        qr_code: order.order_items[0].sku,
        order_date: order.createdAt,
        tracking_url: Tracking_Link || "",
      },
    });
  } catch (error) {
    console.error("TrackOrder Error:", error?.response?.data || error.message);

    return res.status(500).json({
      status: false,
      message: "Failed to track order",
      error: error.message,
    });
  }
};

// Shiprocket Order Track Function
const trackShiprocketOrder = async (shiprocketOrderId) => {
  const url = `https://apiv2.shiprocket.in/v1/external/orders/show/${shiprocketOrderId}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

// Delivery Order Track Function
const trackDeliveryOrder = async (waybill) => {
  try {
    if (!waybill) {
      throw new Error("Waybill is required for tracking");
    }

    /* ----------------------------------
       BUILD TRACKING URL
    ----------------------------------- */

    const url = `https://track.delhivery.com/api/v1/packages/json/?waybill=${waybill}`;

    /* ----------------------------------
       CALL DELHIVERY TRACK API
    ----------------------------------- */

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
      },
    });

    /* ----------------------------------
       VALIDATE RESPONSE
    ----------------------------------- */

    if (!response?.data) {
      throw new Error("Tracking failed");
    }

    /* ----------------------------------
       RETURN RESPONSE
    ----------------------------------- */
    return response.data;
  } catch (error) {
    console.error(
      "Delhivery Tracking Error:",
      error?.response?.data || error.message,
    );

    throw new Error(
      error?.response?.data?.message || "Failed to track Delhivery shipment",
    );
  }
};

// ------------------------------
// Filter Courier Service Company on the basis of Price & Date
// --

const CheckCourierService = async (req, res) => {
  try {
    const { delivery_postcode, compareOn } = req.body;

    if (!delivery_postcode) {
      return res.status(400).json({
        status: false,
        message: "delivery_postcode is required",
      });
    }

    /* ----------------------------------
       1️⃣ GET ACTIVE PARTNER
    ----------------------------------- */

    const config = await AdminConfig.findOne().lean();

    if (!config?.active_partner) {
      return res.status(400).json({
        status: false,
        message: "Active partner not configured",
      });
    }

    const activePartner = config.active_partner;

    let normalizedResponse = null;

    /* =====================================================
       🚀 SHIPROCKET FLOW
    ===================================================== */

    if (activePartner === "shiprocket") {
      const srResponse = await checkShiprocketCouierService(
        delivery_postcode,
        compareOn,
      );

      if (!srResponse?.data) {
        return res.status(400).json({
          status: false,
          message: "Shiprocket service check failed",
        });
      }

      normalizedResponse = {
        courier_company_id: srResponse.data.courier_company_id,
        courier_name: srResponse.data.courier_name,
        estimated_delivery_days: srResponse.data.estimated_delivery_days,
        freight_charge: srResponse.data.freight_charge,
        suppress_date: srResponse.data.suppress_date,
      };
    } else if (activePartner === "delivery") {
      /* =====================================================
       🚚 DELIVERY FLOW
    ===================================================== */
      const dlResponse = await checkDeliverycouierService(delivery_postcode);

      if (!dlResponse?.data) {
        return res.status(400).json({
          status: false,
          message: "Delivery service check failed",
        });
      }

      const tatData = dlResponse.data.tat?.data || {};
      const chargesData = dlResponse.data.charges || {};

      normalizedResponse = {
        courier_company_id: null, // Delhivery does not provide
        courier_name: "Delhivery Surface",
        estimated_delivery_days: tatData.tat || null,
        freight_charge: chargesData.final_total_charge || 0,
        suppress_date: tatData.expected_delivery_date || null,
      };
    }

    /* ----------------------------------
       3️⃣ FINAL RESPONSE
    ----------------------------------- */

    return res.status(200).json({
      status: true,
      active_partner: activePartner,
      data: normalizedResponse,
    });
  } catch (error) {
    console.error(
      "CheckCourierService Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Failed to check courier service",
      error: error.message,
    });
  }
};

const checkShiprocketCouierService = async (delivery_postcode, compareOn) => {
  try {
    // Payload
    const payload = {
      pickup_postcode: 110059,
      delivery_postcode,
      cod: 0,
      weight: "0.05",
      mode: "Surface",
      declared_value: 100,
      length: 20,
      breadth: 8,
      height: 4,
      is_return: 0,
      qc_check: 0,
      only_local: 0,
      product_category: "non-document",
      couriers_type: 0,
      address_type: 1,
      is_oda_check: 1,
      payment_mode: "Prepaid",
    };

    const queryString = new URLSearchParams(payload).toString();

    const API_URL = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${queryString}`;

    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.SHIP_ROCKET_TOKEN}`,
      },
    });

    // console.log("🚚 Shiprocket Response:", response.data);

    let courier_companies =
      response.data.data.available_courier_companies || [];

    courier_companies = courier_companies.map((courier) => {
      const freight = Number(courier.freight_charge) || 0;
      const other = Number(courier.other_charges) || 0;

      return {
        ...courier,
        total_price: freight + other,
      };
    });

    let estimated1 = courier_companies.sort(
      (a, b) => a.total_price - b.total_price,
    );
    let estimated2 = courier_companies.sort(
      (a, b) =>
        Number(a.estimated_delivery_days) - Number(b.estimated_delivery_days),
    );

    if (compareOn === "price") {
      courier_companies.sort((a, b) => a.total_price - b.total_price);
    } else if (compareOn === "days") {
      courier_companies.sort(
        (a, b) =>
          Number(a.estimated_delivery_days) - Number(b.estimated_delivery_days),
      );
    }

    return {
      status: true,
      message: "Serviceability Fetched Successfully",
      is_fast_delivery:
        estimated1[0].estimated_delivery_days ===
        estimated2[0].estimated_delivery_days
          ? false
          : true,
      data: {
        courier_company_id: courier_companies[0].courier_company_id,
        courier_name: courier_companies[0].courier_name,
        estimated_delivery_days: courier_companies[0].estimated_delivery_days,
        freight_charge: courier_companies[0].freight_charge,
        suppress_date: courier_companies[0].suppress_date,
      },
    };
  } catch (error) {
    console.error(
      "❌ Shiprocket Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error?.response?.data || error.message,
    });
  }
};

const checkDeliverycouierService = async (delivery_postcode) => {
  try {
    /* -----------------------------
       VALIDATE INPUT
    ----------------------------- */

    if (!delivery_postcode) {
      return res.status(400).json({
        status: false,
        message: "delivery_postcode is required",
      });
    }

    const { datetime } = getISTDateTime();

    /* -----------------------------
       1️⃣ CALL TAT API
    ----------------------------- */

    const tatParams = {
      origin_pin: 110092,

      destination_pin: delivery_postcode,

      mot: "S",

      pdt: "B2C",

      expected_pickup_date: datetime,
    };

    const tatResponse = await axios.get(
      "https://track.delhivery.com/api/dc/expected_tat",
      {
        params: tatParams,
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        },
      },
    );

    const tatData = tatResponse.data;

    /* -----------------------------
       2️⃣ CALL CHARGES API
    ----------------------------- */

    const chargesParams = {
      md: "S",

      cgm: 10,

      o_pin: 110092,

      d_pin: delivery_postcode,

      ss: "Delivered",

      pt: "Prepaid",

      l: 9,

      b: 8,

      h: 1,

      ipkg_type: "flyer",
    };

    const chargesResponse = await axios.get(
      "https://track.delhivery.com/api/kinko/v1/invoice/charges/.json",
      {
        params: chargesParams,
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        },
      },
    );

    const chargesData = chargesResponse.data?.[0] || {};

    /* -----------------------------
       CALCULATE FINAL CHARGES
    ----------------------------- */

    const deliveryCharge = chargesData.total_amount || 0;

    const platformCharge = 10;

    const finalTotalCharge = deliveryCharge + platformCharge;

    /* -----------------------------
       SUCCESS RESPONSE
    ----------------------------- */

    return {
      status: true,
      message: "Delivery service available",
      data: {
        destination_pin: delivery_postcode,
        expected_delivery_date: tatData?.expected_delivery_date || null,
        tat: tatData,
        charges: {
          delivery_charge: deliveryCharge,
          platform_charge: platformCharge,
          final_total_charge: finalTotalCharge,
          currency: "INR",
        },
      },
    };
  } catch (error) {
    console.error(
      "Delhivery Service Error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      status: false,
      message: "Failed to fetch delivery service details",
      error: error?.response?.data || error.message,
    });
  }
};

const AddNewActivePatner = async (req, res) => {
  try {
    const { admin_id, partner_name } = req.body;

    /* -----------------------------
       1️⃣ VALIDATION
    ----------------------------- */

    if (!admin_id || !partner_name) {
      return res.status(400).json({
        status: false,
        message: "admin_id and partner_name are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(admin_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid admin_id",
      });
    }

    /* -----------------------------
       2️⃣ VERIFY ADMIN
    ----------------------------- */

    const admin = await Admin.findById(admin_id).lean();

    if (!admin) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized access",
      });
    }

    const normalizedPartner = partner_name.trim().toLowerCase();

    /* -----------------------------
       3️⃣ FIND OR CREATE CONFIG
    ----------------------------- */

    let config = await AdminConfig.findOne();

    if (!config) {
      config = new AdminConfig();
    }

    /* -----------------------------
       4️⃣ RESET ALL PARTNERS TO FALSE
    ----------------------------- */

    for (let key of config.partners.keys()) {
      config.partners.set(key, false);
    }

    /* -----------------------------
       5️⃣ SET NEW PARTNER TRUE
    ----------------------------- */

    config.partners.set(normalizedPartner, true);
    config.active_partner = normalizedPartner;

    await config.save();

    return res.status(200).json({
      status: true,
      message: "Active partner switched successfully",
      data: {
        active_partner: config.active_partner,
        partners: Object.fromEntries(config.partners),
      },
    });
  } catch (error) {
    console.error("AddNewActivePatner Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  GenerateOrderByUser,
  ConfirmOrderByAdmin,
  GenerateOrderManifest,
  PrintBulkManifest,
  GenerateShiprocketLabel,
  GenerateDeliveryLabel,
  getUserAllOrder,
  findSingleOrderData,
  GetAllNewOrderListToAdmin,
  findOrderByAdminThrowOrderId,
  findOrderByAdminThrowUserId,
  OrderCancelByAdmin,
  OrderCancelByUser,
  TrackOrderwithOrderId,
  AddNewActivePatner,
  CheckCourierService,
};
