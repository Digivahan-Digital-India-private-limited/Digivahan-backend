const mongoose = require("mongoose");

const rtoChallanCacheSchema = new mongoose.Schema(
  {
    rcNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    challans: [
      {
        challanNumber: String,
        offence: String,
        amountSettledAt: Number,
        transactionStatus: String,
        location: String,
        createdAt: String,
        receiptLink: String,
      }
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RTOChallanCache", rtoChallanCacheSchema);
