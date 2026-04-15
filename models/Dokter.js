const mongoose = require('mongoose');

const JadwalSchema = new mongoose.Schema({
  hari: {
    type: String,
    required: true
  },
  jamPraktik: [{
    jamMulai: {
      type: String,
      required: true
    },
    jamAkhir: {
      type: String,
      required: true
    }
  }]
});

const ReservasiDokterSchema = new mongoose.Schema({
  tanggalReservasi: {
    type: String, // Format: "dd/mm/yyyy"
    required: true
  },
  jamReservasi: {
    type: String,
    required: true
  },
  pertemuanKe: {
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
  tipeReservasi: {
    type: String,
    enum: ['MEDIS', 'KONSULTASI', 'NON_MEDIS'],
    required: true
  },
  laporanRutinitas: {
    type: String
  },
  produkSkincare: [{
    name: String,
    type: String
  }],
  tipeKulit: {
    type: String
  }
});

const HistoriPasienSchema = new mongoose.Schema({
  namaPasien: {
    type: String,
    required: true
  },
  tanggalPenanganan: {
    type: Date,
    default: Date.now
  },
  diagnosis: {
    type: String
  },
  catatan: {
    type: String
  },
  resep: [{
    namaObat: String,
    dosis: String,
    aturanPakai: String
  }]
});

const DokterSchema = new mongoose.Schema({
  foto: {
    type: String,
    default: null
  },
  nama: {
    type: String,
    required: true
  },
  spesialis: {
    type: String,
    required: true
  },
  jadwalPraktik: [JadwalSchema],
  reservasi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservasi'
  },
  jumlahPraktik: {
    type: Number,
    default: 0
  },
  historiPasien: [HistoriPasienSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Dokter', DokterSchema);