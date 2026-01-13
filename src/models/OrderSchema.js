const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  vehicle_id: { type: String, default: "" },
  order_type: { type: String, default: "" },
  name: { type: String, required: true },
  sku: { type: String, default: "QR-001" },
  units: { type: Number, required: true },
  selling_price: { type: Number, required: true },
  selling_price_currency: { type: String, default: "INR" },
  weight: { type: Number, default: 0.05 },
});

const shiprocketStatusSchema = new mongoose.Schema({
  order_id: { type: String, required: true }, // change from Number -> String
  channel_order_id: { type: String, required: true },
  shipment_id: { type: Number, default: null },
  status: { type: String, default: "" },
  status_code: { type: Number, default: 5 },
  onboarding_completed_now: { type: Number, default: 0 },
  awb_code: { type: String, default: "" },
  courier_company_id: { type: String, default: "" },
  courier_name: { type: String, default: "" },
  new_channel: { type: Boolean, default: false },
  delivery_code: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_id: { type: String, required: true },
    order_date: { type: String, required: true },

    sub_total: { type: Number, required: true },
    order_value: { type: Number, required: true },
    order_status: { type: String, default: "NEW" },

    payment_method: { type: String, default: "Prepaid" },
    is_prepared: { type: Boolean, default: false },
    shipping_is_billing: { type: Number, default: 1 },
    is_return: { type: Number, default: 0 },
    declared_value: { type: Number, required: true },

    shipping_customer_name: { type: String, required: true },
    shipping_last_name: { type: String, required: true },
    shipping_phone: { type: String, required: true },
    shipping_address: { type: String, required: true },
    shipping_address_2: { type: String, default: "" },
    shipping_city: { type: String, required: true },
    shipping_state: { type: String, required: true },
    shipping_country: { type: String, required: true },
    shipping_pincode: { type: String, required: true },
    shipping_email: { type: String, required: true },

    billing_customer_name: { type: String, required: true },
    billing_last_name: { type: String, required: true },
    billing_phone: { type: String, required: true },
    billing_address: { type: String, required: true },
    billing_address_2: { type: String, default: "" },
    billing_city: { type: String, required: true },
    billing_state: { type: String, required: true },
    billing_country: { type: String, required: true },
    billing_pincode: { type: String, required: true },

    length: { type: Number, default: 20 },
    breadth: { type: Number, default: 15 },
    height: { type: Number, default: 10 },
    weight: { type: Number, default: 0.05 },

    order_items: [orderItemSchema],

    ship_rocket: shiprocketStatusSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
