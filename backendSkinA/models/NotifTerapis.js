const mongoose = require("mongoose");

const notificationterapisSchema = new mongoose.Schema({
  title: String,
  message: String,
  type: String, // RESERVATION
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("NotifTerapis", notificationterapisSchema);