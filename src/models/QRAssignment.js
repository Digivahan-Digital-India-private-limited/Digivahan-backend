const mongoose = require("mongoose");

const qrAssignmentSchema = new mongoose.Schema(
  {
    qr_id: {
      type: String,
      required: true,
      trim: true,
    },
    qr_img: {
      type: String,
      default: null,
    },
    qr_status: {
      type: String,
      default: "unassigned",
      enum: ["unassigned", "assigned", "blocked"],
      trim: true,
    },
    assigned_by: {
      type: String,
      // required: true,
      enum: ["user", "sales"],
    },
    assign_to: {
      type: String,
      default: "",
      trim: true,
    },
    product_type: {
      type: String,
      default: "vehicle",
      enum: ["vehicle", "pets", "children", "devices"],
      trim: true,
    },
    vehicle_id: {
      type: String,
      // required: true,
      trim: true,
      default: "",
    },
    sales_id: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "damaged", "inactive"],
      default: "active",
    },
    assigned_at: {
      type: Date,
      default: "",
    }
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
// qrAssignmentSchema.index({ qr_id: 1 });
qrAssignmentSchema.index({ vehicle_id: 1 });
qrAssignmentSchema.index({ user_id: 1 });
qrAssignmentSchema.index({ sales_id: 1 });

// Virtual for checking if QR is assigned
qrAssignmentSchema.virtual("isAssigned").get(function () {
  return this.status === "active";
});

// Virtual for checking if QR is damaged
qrAssignmentSchema.virtual("isDamaged").get(function () {
  return this.status === "damaged";
});

// Method to check if QR is valid for assignment
qrAssignmentSchema.methods.isValidForAssignment = function () {
  return this.status === "active" && !this.isAssigned;
};

// Method to mark QR as damaged
qrAssignmentSchema.methods.markAsDamaged = function () {
  this.status = "damaged";
  return this.save();
};

// Static method to find by QR ID
qrAssignmentSchema.statics.findByQRId = function (qrId) {
  return this.findOne({ qr_id: qrId });
};

// Static method to find by Vehicle ID
qrAssignmentSchema.statics.findByVehicleId = function (vehicleId) {
  return this.findOne({ vehicle_id: vehicleId, status: "active" });
};

// Static method to check if vehicle is already assigned
qrAssignmentSchema.statics.isVehicleAssigned = function (vehicleId) {
  return this.findOne({ vehicle_id: vehicleId, status: "active" });
};

// Static method to check if QR is already assigned
qrAssignmentSchema.statics.isQRAssigned = function (qrId) {
  return this.findOne({ qr_id: qrId, status: "active" });
};

module.exports = mongoose.model("QRAssignment", qrAssignmentSchema);
