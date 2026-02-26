const mongoose = require("mongoose");
const { Schema } = mongoose;

const shiprocketOrderSchema = new Schema(
  {
    /* MAIN RELATION WITH ORDER COLLECTION */
    order_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Order",
    },

    /* CHANNEL ORDER ID (your custom order_id string) */
    channel_order_id: {
      type: String,
    },

    /* SHIPROCKET ORDER ID */
    shiprocket_order_id: {
      type: Number,
      index: true,
    },

    shipment_id: {
      type: Number,
    },

    awb_code: {
      type: String,
    },

    courier_company_id: {
      type: Number,
      index: true,
    },

    courier_name: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      index: true,
    },

    status_code: {
      type: Number,
      index: true,
    },

    onboarding_completed_now: Number,

    new_channel: {
      type: Boolean,
      default: false,
    },

    packaging_box_error: String,

    manifest_url: String,

    manifest_generated_at: Date,

    label_url: String,

    label_generated_at: Date,

    tracking_data: Schema.Types.Mixed,

    awb_data: Schema.Types.Mixed,

    pickup_data: Schema.Types.Mixed,

    canceled_at: Date,
  },
  {
    timestamps: true,
  },
);

/* ---------------------------------------
   CRITICAL INDEXES (VERY IMPORTANT)
--------------------------------------- */

// fastest lookup when fetching shiprocket data by order
shiprocketOrderSchema.index({ order_id: 1 });

// fetch using your custom order_id string
shiprocketOrderSchema.index({ channel_order_id: 1 });

// tracking lookup
shiprocketOrderSchema.index({ awb_code: 1 });

// shipment lookup
shiprocketOrderSchema.index({ shipment_id: 1 });

// dashboard queries
shiprocketOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ShiprocketOrder", shiprocketOrderSchema);
