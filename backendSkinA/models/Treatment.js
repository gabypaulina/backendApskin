const mongoose = require('mongoose');

const TreatmentSchema = new mongoose.Schema({
    judul: {
      type: String,
      required: true,
    },
    pic: {
      type: String,
      required: true,
    },
    isi: {
      type: String,
      required: true,
    },

});

module.exports = mongoose.model('Treatment', TreatmentSchema)