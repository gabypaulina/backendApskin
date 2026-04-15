const mongoose = require('mongoose');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
    nama: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      minlength: 8,
      required: true,
    },
    tanggalLahir: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
            // Validate dd/mm/yyyy format
            return /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/.test(v);
        },
      }
    },
    noHandphone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
            // Validate Indonesian phone number format
            return /^(\+62|0)[0-9]{9,12}$/.test(v);
        },
      }
    },
    alamat: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'user'
    },
    poin: {
      type: Number,
      default:0,
    },
    // rutinitasHarian: {
    //   type: Number,
    //   default: 0,
    //   min: 0,
    //   max: 100
    // },
    laporanRutinitas:[
      {
        tanggal: {
          type: Date
        },
        persentase: {
          type: Number,
          default: 0,
          min: 0,
          max: 100
        }
      }
    ],
    skincareRutinitas: {
      pagi: [{
        productId: mongoose.Schema.Types.ObjectId,
        completed: Boolean,
        scheduledTime: String
      }],
      malam: [{
        productId: mongoose.Schema.Types.ObjectId,
        completed: Boolean,
        scheduledTime: String
      }]
    },
    reservasi: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservasi'
    }],
    hasCompletedQna: {
      type: Boolean,
      default: false
    },
    favoriteDoctors: [{
      doctorId: String,
      doctorName: String,
      isFavorite: Boolean
    }],
    qnaCompletedAt: {
        type: Date,
        default: null
    },
    fcmToken: {
      type: String,
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String
});

module.exports = mongoose.model('User', UserSchema)