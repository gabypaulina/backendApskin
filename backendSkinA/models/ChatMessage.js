// models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  image: {
    type: String
  },
  senderType: {
    type: String,
    enum: ['user', 'doctor'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', chatSchema);