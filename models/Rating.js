const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
        unique: true,
    },
    score: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

ratingSchema.statics.calculateAverageRating = async function (doctorId) {
    const stats = await this.aggregate([
        { $match: { doctorId: doctorId } },
        {
            $group: {
                _id: '$doctorId',
                numberOfRatings: { $sum: 1 },
                averageRating: { $avg: '$score' }
            }
        }
    ]);

    try {
        if (stats.length > 0) {
            await mongoose.model('User').findByIdAndUpdate(doctorId, {
                averageRating: stats[0].averageRating,
                numberOfRatings: stats[0].numberOfRatings
            });
        } else {
            await mongoose.model('User').findByIdAndUpdate(doctorId, {
                averageRating: 0,
                numberOfRatings: 0
            });
        }
    } catch (err) {
        console.error("Lỗi khi cập nhật rating cho bác sĩ:", err);
    }
};

ratingSchema.post('save', function () {
    this.constructor.calculateAverageRating(this.doctorId);
});

ratingSchema.post('remove', function () { 
    this.constructor.calculateAverageRating(this.doctorId);
});


const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;