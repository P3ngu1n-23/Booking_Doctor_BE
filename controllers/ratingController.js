const Rating = require('../models/Rating');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor'); // User model for Doctor
const mongoose = require('mongoose');

const createRating = async (req, res) => {
    const patientId = req.user.id;
    const { doctorId, appointmentId, score, comment } = req.body;

    if (!doctorId || !appointmentId || !score) {
        return res.status(400).json({ message: 'Doctor ID, Appointment ID, and Score are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ message: 'Invalid Doctor ID or Appointment ID format.' });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
        return res.status(400).json({ message: 'Score must be a number between 1 and 5.' });
    }

    try {
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.patientId.toString() !== patientId) {
            return res.status(403).json({ message: 'You are not authorized to rate this appointment.' });
        }

        if (appointment.doctorId.toString() !== doctorId) {
            return res.status(400).json({ message: 'Doctor ID does not match the doctor in the appointment.' });
        }

        if (appointment.status !== 'completed') { // "Đã khám xong" [cite: 29]
            return res.status(400).json({ message: 'Appointment must be completed before it can be rated.' }); // [cite: 29]
        }

        const existingRating = await Rating.findOne({ appointmentId });
        if (existingRating) {
            return res.status(400).json({ message: 'This appointment has already been rated.' });
        }

        const doctorExists = await Doctor.findById(doctorId);
        if (!doctorExists || doctorExists.role !== 'Doctor') {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const rating = await Rating.create({
            patientId,
            doctorId,
            appointmentId,
            score: numericScore, // [cite: 29]
            comment: comment || '', // [cite: 29]
        });

        // Hook post('save') trong Rating model sẽ tự động cập nhật averageRating cho Doctor.

        res.status(201).json(rating);

    } catch (error) {
        console.error(error);
        if (error.code === 11000 && error.keyPattern && error.keyPattern.appointmentId) {
            return res.status(400).json({ message: 'This appointment has already been rated (duplicate key error).' });
        }
        res.status(500).json({ message: 'Server error while creating rating.' });
    }
};

const getRatingsForDoctor = async (req, res) => {
    const { doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ message: 'Invalid Doctor ID format.' });
    }

    try {
        const doctorExists = await Doctor.findById(doctorId);
        if (!doctorExists || doctorExists.role !== 'Doctor') {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const ratings = await Rating.find({ doctorId })
            .populate({
                path: 'patientId',
                select: 'name avatar', // Chỉ lấy tên và avatar của bệnh nhân đánh giá
                model: 'User'
            })
            .sort({ createdAt: -1 }); // Mới nhất lên đầu

        res.status(200).json(ratings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching ratings.' });
    }
};


module.exports = {
    createRating,
    getRatingsForDoctor,
};