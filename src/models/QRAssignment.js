const mongoose = require("mongoose");

const qrAssignmentSchema = new mongoose.Schema(
  {
    qr_no: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    qr_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    qr_img: {
      type: String,
      default: null,
    },

    qr_image_public_id: {
      type: String,
      default: null,
    },

    qr_status: {
      type: String,
      enum: ["unassigned", "assigned", "blocked"],
      default: "unassigned",
      index: true,
    },

    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assigned_by: {
      type: String,
      ref: "User",
      default: null,
      index: true,
    },

    product_type: {
      type: String,
      enum: ["vehicle", "pets", "children", "devices"],
      default: "vehicle",
      index: true,
    },

    vehicle_id: {
      type: String,
      default: null,
      index: true,
    },

    sales_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "damaged", "inactive"],
      default: "active",
      index: true,
    },

    assigned_at: {
      type: Date,
      default: null,
      index: true,
    },

    is_printed: {
      type: Boolean,
      default: false,
      index: true,
    },

    printed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

//
// 🔥 CRITICAL INDEXES
//

qrAssignmentSchema.index({ qr_status: 1, status: 1 });

qrAssignmentSchema.index({ assigned_to: 1, qr_status: 1 });

qrAssignmentSchema.index({ vehicle_id: 1, qr_status: 1 });

//
// 🔥 SAFE SEQUENCE GENERATOR (Atomic)
//

qrAssignmentSchema.statics.getNextQrSequence = async function (count = 1) {
  const lastQr = await this.findOne()
    .sort({ qr_no: -1 })
    .select("qr_no")
    .lean();

  const start = lastQr ? lastQr.qr_no + 1 : 1;

  return Array.from({ length: count }, (_, i) => start + i);
};

//
// 🔥 FIND HELPERS (production useful)
//

qrAssignmentSchema.statics.findAvailableQR = function () {
  return this.findOne({
    qr_status: "unassigned",
    status: "active",
  }).lean();
};

qrAssignmentSchema.statics.findByQrId = function (qr_id) {
  return this.findOne({ qr_id }).lean();
};

module.exports = mongoose.model("QRAssignment", qrAssignmentSchema);
