const mongoose = require("mongoose");

const notificationdokterSchema = new mongoose.Schema({
  doctorRoom: {
    type: String,
    required: true,
  },
  title: String,
  message: String,
  type: String, 
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("NotifDokter", notificationdokterSchema);