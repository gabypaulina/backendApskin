const mongoose = require('mongoose');

const ArtikelSchema = new mongoose.Schema({
    judul: {
        type: String,
        required: true,
        trim: true
    },
    gambar: {
        type: String,
        required: true
    },
    sumber: {
        type: String,
        required: true,
        trim: true
    },
    isi: {
        type: String,
        required: true
    },
    tanggalPembuatan: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual untuk URL gambar lengkap
ArtikelSchema.virtual('gambarUrl').get(function() {
    return `${process.env.BASE_URL}${this.gambar}`;
});

module.exports = mongoose.model('Artikel', ArtikelSchema);