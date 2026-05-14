const mongoose = require("mongoose");

const challanWebhookSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      trim: true,
    },
    challanNumber: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rcNumber: {
      type: String,
      trim: true,
    },
    transactionStatus: {
      type: String,
      trim: true,
    },
    isSettled: {
      type: Boolean,
    },
    amountSettledAt: {
      type: Number,
    },
    refundAmount: {
      type: String,
      trim: true,
    },
    convenienceFee: {
      type: Number,
    },
    paymentGatewayFee: {
      type: Number,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    receiptLink: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      trim: true,
    },
    receiptFile: {
      type: String,
      trim: true,
    },
    ioStatus: {
      type: String,
      trim: true,
    },
    
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChallanWebhook", challanWebhookSchema);
