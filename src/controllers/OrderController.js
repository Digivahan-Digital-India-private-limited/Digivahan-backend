const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const Order = require("../models/OrderSchema");

// ------------------------------
// Format Order Date (YYYY-MM-DD HH:mm)
// ------------------------------
const formatOrderDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// ------------------------------
// Generate Order Controller
// ------------------------------
const GenerateOrderByUser = async (req, res) => {
  try {
    const {
      user_id,
      order_id,
      sub_total,
      order_value,
      declared_value,
      is_prepared,
      shipping_is_billing = 1,
      is_return = 0,

      // Shipping
      shipping_customer_name,
      shipping_last_name,
      shipping_phone,
      shipping_address,
      shipping_address_2,
      shipping_city,
      shipping_state,
      shipping_country,
      shipping_pincode,
      shipping_email,

      // Billing
      billing_customer_name,
      billing_last_name,
      billing_phone,
      billing_address,
      billing_address_2 = "",
      billing_city,
      billing_state,
      billing_country,
      billing_pincode,

      // Order Item
      vehicle_id,
      order_type,
      name,
      sku = "QR-001",
      units,
      selling_price,
      selling_price_currency = "INR",
      discount = "",
      tax = "",
      weight = 0.05,

      // Parcel dimensions
      length = 20,
      breadth = 15,
      height = 10,
    } = req.body;

    // -----------------------------
    // Find User
    // -----------------------------
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Invalid User ID",
      });
    }

    const currentOrderDate = formatOrderDate();

    // -----------------------------
    // Prepare Order Data
    // -----------------------------
    const orderData = {
      order_id,
      order_date: currentOrderDate,

      sub_total,
      order_value,
      declared_value,
      is_prepared,
      shipping_is_billing,
      is_return,
      payment_method: "Prepaid",

      // Shipping
      shipping_customer_name,
      shipping_last_name,
      shipping_phone,
      shipping_address,
      shipping_address_2,
      shipping_city,
      shipping_state,
      shipping_country,
      shipping_pincode,
      shipping_email,

      // Billing
      billing_customer_name,
      billing_last_name,
      billing_phone,
      billing_address,
      billing_address_2,
      billing_city,
      billing_state,
      billing_country,
      billing_pincode,

      // Parcel
      length,
      breadth,
      height,
      weight,

      // Items
      order_items: [
        {
          vehicle_id,
          order_type,
          name,
          sku,
          units,
          selling_price: Number(selling_price),
          selling_price_currency,
          discount,
          tax,
          weight,
        },
      ],
    };

    // ------------------------------
    // Save order in MongoDB
    // ------------------------------
    const newOrder = await Order.create({
      user_id,
      ...orderData,
    });

    // ------------------------------
    // Save in User.my_orders
    // ------------------------------
    await User.findByIdAndUpdate(
      user_id,
      {
        $push: {
          my_orders: {
            order_id: newOrder._id,
            order_data: orderData,
          },
        },
      },
      { new: true }
    );

    return res.status(201).json({
      status: true,
      message: "Order created successfully (without Shiprocket)",
      data: newOrder,
    });
  } catch (error) {
    console.log("Order Creation Error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Order confirm By admin
const ConfirmOrderByAdmin = async (req, res) => {
  try {
    const { order_id } = req.body; // yeh Mongo _id hoga

    // 1) Find Order by _id
    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    // 2) Check status
    if (order.order_status !== "NEW") {
      return res.status(400).json({
        status: false,
        message: `Order is already ${order.order_status}`,
      });
    }

    // 3) Prepare data for Shiprocket
    const shiprocketPayload = {
      order_id: order.order_id, // payment/order id
      order_date: order.order_date,
      sub_total: order.sub_total,
      order_value: order.order_value,
      payment_method: order.payment_method,
      is_prepared: order.is_prepared,
      shipping_is_billing: order.shipping_is_billing,
      is_return: order.is_return,
      declared_value: order.declared_value,

      // Shipping
      shipping_customer_name: order.shipping_customer_name,
      shipping_last_name: order.shipping_last_name,
      shipping_phone: order.shipping_phone,
      shipping_address: order.shipping_address,
      shipping_address_2: order.shipping_address_2,
      shipping_city: order.shipping_city,
      shipping_state: order.shipping_state,
      shipping_country: order.shipping_country,
      shipping_pincode: order.shipping_pincode,
      shipping_email: order.shipping_email,

      // Billing
      billing_customer_name: order.billing_customer_name,
      billing_last_name: order.billing_last_name,
      billing_phone: order.billing_phone,
      billing_address: order.billing_address,
      billing_address_2: order.billing_address_2,
      billing_city: order.billing_city,
      billing_state: order.billing_state,
      billing_country: order.billing_country,
      billing_pincode: order.billing_pincode,

      // Parcel
      length: order.length,
      breadth: order.breadth,
      height: order.height,
      weight: order.weight,

      // Items
      order_items: order.order_items,
    };

    // 4) Call Shiprocket
    const shiprocketResponse = await createShiprocketOrder(shiprocketPayload);

    if (!shiprocketResponse) {
      return res.status(500).json({
        status: false,
        message: "Shiprocket API failed",
      });
    }

    // 5) Update Order after confirmation
    order.ship_rocket = shiprocketResponse;
    order.ship_rocket.status = "PENDING"; // 🔥 Shiprocket status
    order.order_status = "PENDING"; // Order status
    order.is_prepared = true; // ✅ Admin prepared
    await order.save();

    // 6) Update in User.my_orders also
    await User.updateOne(
      { _id: order.user_id, "my_orders.order_id": order._id },
      {
        $set: {
          "my_orders.$.order_data": order,
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: "Order confirmed and sent to Shiprocket",
      data: order,
    });
  } catch (error) {
    console.log("ConfirmOrderByAdmin Error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
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
      }
    );
    return response.data;
  } catch (error) {
    console.log("Shiprocket API Error:", error?.response?.data);
    return null;
  }
};

// ------------------------------
// Get All Order From user My-order node
// ------------------------------

const getUserAllOrder = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Validate
    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    // Find user and get only my_orders field
    const user = await User.findById(user_id).select("my_orders");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // If no orders found
    if (!user.my_orders || user.my_orders.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No orders found for this user",
        orders: [],
      });
    }

    // Return all orders
    return res.status(200).json({
      status: true,
      message: "User orders fetched successfully",
      orders: user.my_orders,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// Find Single Order Details
// --
const findSingleOrderData = async (req, res) => {
  try {
    const { user_id, order_id } = req.body;

    // Find user
    const user = await User.findById(user_id).select("my_orders");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Find order inside user.my_orders array
    const specificOrder = user.my_orders.find(
      (order) => order.order_id?.toString() === order_id.toString()
    );

    if (!specificOrder) {
      return res.status(404).json({
        status: false,
        message: "Order not found for this user",
      });
    }

    // Success response
    return res.status(200).json({
      status: true,
      message: "Order details fetched successfully",
      order: specificOrder,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// Filter Courier Service Company on the basis of Price & Date
// --
const checkCouierService = async (req, res) => {
  try {
    const { delivery_postcode, compareOn } = req.body;

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

    console.log("📦 Checking Serviceability => ", API_URL);

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

    if (compareOn === "price") {
      courier_companies.sort((a, b) => a.total_price - b.total_price);
    } else if (compareOn === "days") {
      courier_companies.sort(
        (a, b) =>
          Number(a.estimated_delivery_days) - Number(b.estimated_delivery_days)
      );
    }

    return res.status(200).json({
      status: true,
      message: "Serviceability Fetched Successfully",
      data: courier_companies,
    });
  } catch (error) {
    console.error(
      "❌ Shiprocket Error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error?.response?.data || error.message,
    });
  }
};

// ------------------------------
// Get Order Details By Admin
// --
const findOrderByOrderId = async (req, res) => {
  try {
    const { order_id } = req.body;

    // Validate input
    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "order_id is required",
      });
    }

    // Find order in DB
    const order = await Order.findOne({ order_id });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("❌ Error fetching order:", error.message);

    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// Get All Order by userId Order node
// --

const findOrderByUserId = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "user_id is required",
      });
    }

    let query = {};

    // Try converting to ObjectId
    if (mongoose.Types.ObjectId.isValid(user_id)) {
      query.user_id = new mongoose.Types.ObjectId(user_id);
    } else {
      // If not valid ObjectId → search by raw string
      query.user_id = user_id;
    }

    const orders = await Order.find(query);

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No orders found for this user",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("❌ Error finding orders:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// This apis only hit by user
const OrderCanceByUser = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        status: false,
        message: "Order id is required",
      });
    }

    // 1) Find order by _id
    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    // 2) Check prepared status
    if (order.is_prepared === true) {
      return res.status(400).json({
        status: false,
        message: "This order is already prepared, you cannot cancel it",
      });
    }

    // 3) Cancel order
    order.order_status = "CANCELED";
    await order.save();

    // 4) Update in user.my_orders also
    await User.updateOne(
      { _id: order.user_id, "my_orders.order_id": order._id },
      {
        $set: {
          "my_orders.$.order_data.order_status": "CANCELED",
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: "Order canceled successfully",
      data: order,
    });
  } catch (error) {
    console.log("OrderCanceByUser Error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ------------------------------
// Order Cancel By Admin
// --
const OrderCancelByAdmin = async (req, res) => {
  try {
    const { user_id, order_id, shiprocket_orderId } = req.body;

    if (!user_id || !order_id || !shiprocket_orderId) {
      return res.status(400).json({
        status: false,
        message: "user_id, order_id and shiprocket_orderId are required",
      });
    }

    // 1️⃣ Find order by order_id (FAST)
    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    // 2️⃣ Verify order belongs to user
    if (String(order.user_id) !== String(user_id)) {
      return res.status(403).json({
        status: false,
        message: "This order does not belong to this user",
      });
    }

    // 3️⃣ Verify Shiprocket Order ID
    if (String(order.ship_rocket?.order_id) !== String(shiprocket_orderId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid Shiprocket order id",
      });
    }

    // 4️⃣ Call Shiprocket Cancel API
    const cancelResponse = await cancelShiprocketOrder(shiprocket_orderId);

    if (!cancelResponse?.status_code) {
      return res.status(400).json({
        status: false,
        message: "Shiprocket order cancellation failed",
        shiprocket_response: cancelResponse,
      });
    }

    // 5️⃣ Update ORDER schema
    order.ship_rocket.status = "CANCELED";
    order.is_prepared = false;
    order.ship_rocket.delivery_code = "";

    await order.save();

    // 6️⃣ Update USER schema (my_orders array)
    await User.updateOne(
      {
        _id: user_id,
        "my_orders.order_id": order._id,
      },
      {
        $set: {
          "my_orders.$.order_data.ship_rocket.status": "CANCELED",
          "my_orders.$.order_data.ship_rocket.delivery_code": "",
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: "Order cancelled successfully",
      order_id,
      shiprocket_orderId,
      shiprocket_response: cancelResponse,
    });
  } catch (error) {
    console.error(
      "Order cancel error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      status: false,
      message: "Failed to cancel order",
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
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Shiprocket cancel order error:",
      error?.response?.data || error.message
    );
    throw error;
  }
};

// Track Order Status
const TrackOrderwithOrderId = async (req, res) => {
  try {
    const { user_id, order_id, shiprocket_orderId } = req.body;

    if (!user_id || !order_id || !shiprocket_orderId) {
      return res.status(400).json({
        status: false,
        message: "user_id, order_id and shiprocket_orderId are required",
      });
    }

    /* ----------------------------------
       1️⃣ Find order by order_id (FAST)
    -----------------------------------*/
    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    /* ----------------------------------
       2️⃣ Check order belongs to user
    -----------------------------------*/
    if (String(order.user_id) !== String(user_id)) {
      return res.status(403).json({
        status: false,
        message: "This order does not belong to this user",
      });
    }

    /* ----------------------------------
       3️⃣ Validate Shiprocket order ID
    -----------------------------------*/
    if (String(order.ship_rocket?.order_id) !== String(shiprocket_orderId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid Shiprocket order id",
      });
    }

    /* ----------------------------------
       4️⃣ Call Shiprocket Tracking API
    -----------------------------------*/
    const trackingData = await trackShiprocketOrder(shiprocket_orderId);

    /* ----------------------------------
       5️⃣ Extract shipment status & delivery_code
       (shipment status preferred)
    -----------------------------------*/
    const shipmentStatus =
      trackingData?.data?.shipments?.status ||
      trackingData?.data?.status ||
      "UNKNOWN";

    const deliveryCode = trackingData?.data?.delivery_code || "";

    /* ----------------------------------
       6️⃣ Update ORDER schema
    -----------------------------------*/
    order.ship_rocket.status = shipmentStatus;
    order.ship_rocket.delivery_code = deliveryCode;

    await order.save();

    /* ----------------------------------
       7️⃣ Update USER schema (my_orders)
    -----------------------------------*/
    await User.findOneAndUpdate(
      {
        _id: user_id,
        "my_orders.order_id": new mongoose.Types.ObjectId(order_id),
      },
      {
        $set: {
          "my_orders.$.order_data.ship_rocket.status": shipmentStatus,
          "my_orders.$.order_data.ship_rocket.delivery_code": deliveryCode,
        },
      }
    );

    /* ----------------------------------
       8️⃣ Response
    -----------------------------------*/
    return res.status(200).json({
      status: true,
      message: "Order tracked & updated successfully",
      order_id,
      shiprocket_orderId,
      shipment_status: shipmentStatus,
      delivery_code: deliveryCode,
      tracking: trackingData,
    });
  } catch (error) {
    console.error("Track order error:", error?.response?.data || error.message);

    return res.status(500).json({
      status: false,
      message: "Failed to track order",
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

module.exports = {
  GenerateOrderByUser,
  ConfirmOrderByAdmin,
  getUserAllOrder,
  findSingleOrderData,
  checkCouierService,
  findOrderByOrderId,
  findOrderByUserId,
  OrderCancelByAdmin,
  OrderCanceByUser,
  TrackOrderwithOrderId,
};
