const mongoose = require("mongoose");

const RevokedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    expires: 0, // 🔥 TTL index (auto delete after expiry)
  },
});

module.exports = mongoose.model("RevokedToken", RevokedTokenSchema);
