const mongoose = require('mongoose');
const User = require('./User');

const patientSchema = new mongoose.Schema({
    dateOfBirth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['Nam', 'Nữ', 'Khác'],
    },
    address: {
        type: String,
        trim: true,
    },
});

const Patient = User.discriminator('Patient', patientSchema);

module.exports = Patient;