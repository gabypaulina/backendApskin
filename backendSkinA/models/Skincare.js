const mongoose = require('mongoose');

const SkincareSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['Toner', 'Essence', 'Serum', 'Moisturizer', 'Obat Jerawat', 'Sunscreen'],
            required: true
        },
        ingredients: [{
            type: String,
            required: true
        }],
    }]
});

module.exports = mongoose.model('Skincare', SkincareSchema);