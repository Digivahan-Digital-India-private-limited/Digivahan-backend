const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ----------------------------------
   ORDER ITEM
-----------------------------------*/
const orderItemSchema = new Schema(
  {
    vehicle_id: String,

    order_type: {
      type: String,
      enum: ["Prepaid", "COD"],
      default: "Prepaid",
    },

    name: String,

    sku: {
      type: String,
      default: "QR-001",
    },

    units: Number,

    selling_price: Number,

    selling_price_currency: {
      type: String,
      default: "INR",
    },

    weight: Number,
  },
  { _id: false },
);

/* ----------------------------------
   MAIN ORDER SCHEMA
-----------------------------------*/
const orderSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    order_id: {
      type: String,
      required: true,
    },

    order_date: {
      type: Date,
      default: Date.now,
    },

    order_status: {
      type: String,
      enum: [
        "NEW",
        "PENDING",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "CANCELED",
        "RETURNED",
        "PICKUP SCHEDULED",
        "PICKED UP",
        "IN_TRANSIT"
      ],
      default: "NEW",
    },

    canceled_at: Date,

    active_partner: {
      type: String,
      enum: ["shiprocket", "delivery", "manual"],
      required: true,
      index: true,
    },

    partner_order_created: {
      type: Boolean,
      default: false,
    },

    shipping_mode: {
      type: String,
      default: "Surface",
    },

    payment_method: {
      type: String,
      enum: ["Prepaid", "COD"],
      default: "Prepaid",
    },

    is_prepared: {
      type: Boolean,
      default: false,
    },

    shipping_is_billing: {
      type: Boolean,
      default: true,
    },

    is_return: {
      type: Boolean,
      default: false,
    },

    sub_total: Number,

    order_value: Number,

    declared_value: Number,

    courier_company_id: {
      type: Number,
      index: true,
    },

    courier_name: {
      type: String,
      index: true,
    },

    shipping: {
      first_name: String,
      last_name: String,
      phone: String,
      email: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    billing: {
      first_name: String,
      last_name: String,
      phone: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    parcel: {
      length: Number,
      breadth: Number,
      height: Number,
      weight: Number,
    },

    order_items: {
      type: [orderItemSchema],
      required: true,
    },
    last_tracked_at: Date,
  },
  { timestamps: true },
);

orderSchema.index({ order_id: 1 });

orderSchema.index({ user_id: 1, createdAt: -1 });

orderSchema.index({ order_status: 1, createdAt: -1 });

orderSchema.index({ active_partner: 1, createdAt: -1 });

orderSchema.index({ courier_company_id: 1, createdAt: -1 });

orderSchema.index({ partner_order_created: 1, order_status: 1 });

orderSchema.index({ "shipping.phone": 1 });

orderSchema.index({ "shipping.pincode": 1 });

orderSchema.index({ createdAt: -1 });

orderSchema.index({ order_id: 1, user_id: 1 });

module.exports = mongoose.model("Order", orderSchema);
