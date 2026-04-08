const mongoose = require('mongoose');

const ResepSchema = new mongoose.Schema({
  namaObat: {
    type: String,
    required: true
  },
  dosis: {
    type: String,
    required: true
  },
  aturanPakai: {
    type: String,
    required: true
  }
});

const KonsultasiSchema = new mongoose.Schema({
  idReservasi: {
    type: String,
    ref: 'Reservasi',
    required: true
  },
  pertemuan: {
    type: Number,
    required: true
  },
  namaPasien: {
    type: String,
    required: true
  },
  umurPasien: {
    type: Number,
    required: true
  },
  tipe: {
    type: String,
    enum: ['MEDIS', 'KONSULTASI'],
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
  catatanDokter: {
    type: String
  },
  resep: [ResepSchema],
  diagnosis: {
    type: String
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

module.exports = mongoose.model('Konsultasi', KonsultasiSchema);