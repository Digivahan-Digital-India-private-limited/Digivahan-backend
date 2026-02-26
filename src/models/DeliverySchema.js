const mongoose = require("mongoose");
const { Schema } = mongoose;

const deliveryOrderSchema = new Schema(
  {
    /* RELATION WITH ORDER COLLECTION */
    order_id: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    /* MAIN DELIVERY RESPONSE */

    waybill: {
      type: String,
    },

    reference_number: {
      type: String,
    },

    upload_wbn: {
      type: String,
      index: true,
    },

    client: {
      type: String,
      index: true,
    },

    payment_mode: {
      type: String,
      enum: ["Pre-paid", "COD"],
      index: true,
    },

    cod_amount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      index: true,
    },

    sort_code: {
      type: String,
      index: true,
    },

    serviceable: {
      type: Boolean,
      default: true,
    },

    remarks: {
      type: [String],
      default: [],
    },

    /* COUNTS */

    package_count: Number,

    prepaid_count: Number,

    cod_count: Number,

    pickups_count: Number,

    replacement_count: Number,

    cash_pickups_count: Number,

    cash_pickups: Number,

    /* TRACKING & RAW RESPONSE */

    pickup_data: Schema.Types.Mixed,

    raw_response: Schema.Types.Mixed,

    tracking_data: Schema.Types.Mixed,

    tracking_url: String,

    label_url: String,

    label_generated_at: Date,

    last_tracked_at: Date,

    canceled_at: Date,
  },
  {
    timestamps: true,
  },
);

/* ----------------------------------
   IMPORTANT INDEXES
----------------------------------- */

// fastest lookup by order
deliveryOrderSchema.index({ order_id: 1 });

// tracking lookup
deliveryOrderSchema.index({ waybill: 1 });

// status dashboard
deliveryOrderSchema.index({ status: 1, createdAt: -1 });

// reference lookup
deliveryOrderSchema.index({ reference_number: 1 });

module.exports = mongoose.model("DeliveryOrder", deliveryOrderSchema);
