const mongoose = require('mongoose');

const TreatmentSchema = new mongoose.Schema({
  namaTreatment: {
    type: String,
    required: true
  },
  harga: {
    type: Number,
    required: true
  },
  qty: {
    type: Number,
    default: 1
  }
});

const TransaksiSchema = new mongoose.Schema({
  idTransaksi: {
    type: String,
    required: true,
    unique: true
  },
  tanggalKonfirmasi: {
    type: Date
  },
  statusPembayaran: {
    type: String,
    enum: ['belum_konfirmasi', 'selesai'],
    default: 'belum_konfirmasi'
  },
  jamKonfirmasi: {
    type: String
  },
  tanggalReservasi: {
    type: String, // Format: "dd/mm/yyyy"
    required: true
  },
  jamReservasi: {
    type: String,
    required: true
  },
  namaPasien: {
    type: String,
    required: true
  },
  tipe: {
    type: String,
    enum: ['MEDIS', 'KONSULTASI', 'NON_MEDIS'],
    required: true
  },
  pic: {
    type: String,
    required: true
  },
  totalPembayaran: {
    type: Number,
    required: true
  },
  treatments: [TreatmentSchema],
  metodePembayaran: {
    type: String,
    enum: ['transfer', 'cash'],
    required: true
  },
  diagnosis: {
    type: String
  },
  catatanDokter: {
    type: String
  },
  resep: [{
    namaObat: String,
    dosis: String,
    aturanPakai: String
  }],
  totalPertemuan: {
    type: Number,
    default: 1
  },
  poin: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaksi', TransaksiSchema);