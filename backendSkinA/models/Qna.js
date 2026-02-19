const mongoose = require('mongoose');

const QnaSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
        type: Date,
        default: Date.now
    },
    responses:[{
        questionId: {
            type: Number,
            required: true
        },
        questionText: {
            type: String,
            required: true
        },
        questionImage: {
            type: String, // Menyimpan path gambar pertanyaan jika ada
            default: null
        },
        answerIndex: {
            type: Number,
            required: true
        },
        answerText: {
            type: String,
            required: true
        },
        answerImage: {
            type: String, // Menyimpan path gambar jawaban jika ada
            default: null
        },
        answerType: {
            type: String,
            enum: ['text', 'image'],
            required: true
        },
    }],
});

module.exports = mongoose.model('Qna', QnaSchema)