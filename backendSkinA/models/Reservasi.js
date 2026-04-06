const mongoose = require('mongoose');

const ReservasiSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tanggalReservasi: {
    type: String, // Format: "dd/mm/yyyy"
    required: true
  },
  jamReservasi: {
    type: String,
    required: true
  },
  treatment: {
    type: String,
    required: function() {
      return this.tipe === 'NON_MEDIS';
    }
  },
  tipe: {
    type: String,
    enum: ['MEDIS', 'KONSULTASI', 'NON_MEDIS'],
    required: true
  },
  namaPasien: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['menunggu', 'berlangsung', 'selesai', 'reschedule'],
    default: 'menunggu'
  },
  pic: {
    type: String, // Bisa ID dokter atau nama terapis
    required: true
  },
  laporanRutinitas: {
    type: String // Changed from Number to String based on your error
  },
  produkSkincare: [{
    name: {
      type: String,
      required: true
    },
    productType: { // Changed from 'type' to 'productType' to avoid conflicts
      type: String,
      required: true
    },
    productIngredients: [{
      type: String,
      required: true
    }]
  }],
  tipeKulit: {
    type: String // Changed from array to single string
  },
  pertemuan:{
    type: Number,
    default: 1
  },
  hasilTreatment: [{
    type: String
  }],
  diagnosis: {
    type: String
  },
  note: {
    type: String
  },
  resep: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'expired', 'failed'],
    default: 'pending'
  },
  xenditInvoiceId: String,
  paymentUrl: String,
  amount: Number,
  paidAt: Date
});

module.exports = mongoose.model('Reservasi', ReservasiSchema);