const mongoose = require('mongoose');
const User = require('./User'); // User model cơ sở

const doctorSchema = new mongoose.Schema({
    specialization: {
        type: String,
        required: [true, 'Chuyên khoa là bắt buộc'],
        trim: true,
    },
    experience: {
        type: String,
        trim: true,
    },
    qualifications: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    clinicInfo: {
        name: String,
        address: String,
        phoneNumber: String,
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: val => Math.round(val * 10) / 10, // Làm tròn đến 1 chữ số thập phân
    },
    numberOfRatings: {
        type: Number,
        default: 0,
    },
});

const Doctor = User.discriminator('Doctor', doctorSchema);

module.exports = Doctor;