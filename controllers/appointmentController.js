const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorWorkSchedule = require('../models/DoctorWorkSchedule');
const User = require('../models/User');
const mongoose = require('mongoose');

const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const getAvailableTimeSlots = async (req, res) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
        return res.status(400).json({ message: 'doctorId and date are required.' });
    }

    try {
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        const doctorExists = await Doctor.findById(doctorId);
        if (!doctorExists) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const schedule = await DoctorWorkSchedule.findOne({
            doctorId,
            date: targetDate,
        });

        if (!schedule || schedule.shifts.length === 0) {
            return res.status(200).json({ date: targetDate, availableSlotsByShift: [] });
        }

        const existingAppointments = await Appointment.find({
            doctorId,
            date: targetDate,
            status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'completed'] }, // Cập nhật ở đây
        }).select('startTime');

        const bookedStartTimes = existingAppointments.map(app => app.startTime);
        const availableSlotsByShift = [];

        for (const shift of schedule.shifts) {
            const shiftSlots = {
                shiftName: shift.shift,
                slots: [],
            };
            const shiftStartMinutes = timeToMinutes(shift.startTime);
            const shiftEndMinutes = timeToMinutes(shift.endTime);

            for (let slotStartMinutes = shiftStartMinutes;
                slotStartMinutes < shiftEndMinutes;
                slotStartMinutes += DEFAULT_APPOINTMENT_DURATION_MINUTES) {

                const slotStartTimeStr = minutesToTime(slotStartMinutes);
                const slotEndMinutes = slotStartMinutes + DEFAULT_APPOINTMENT_DURATION_MINUTES;

                if (slotEndMinutes > shiftEndMinutes) continue;

                if (!bookedStartTimes.includes(slotStartTimeStr)) {
                    shiftSlots.slots.push(slotStartTimeStr);
                }
            }
            if (shiftSlots.slots.length > 0) {
                availableSlotsByShift.push(shiftSlots);
            }
        }
        res.status(200).json({ date: targetDate, availableSlotsByShift });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching available slots.' });
    }
};

const createAppointment = async (req, res) => {
    const patientId = req.user.id;
    const { doctorId, date, shift, startTime, reasonForVisit } = req.body;

    if (!doctorId || !date || !shift || !startTime) {
        return res.status(400).json({ message: 'doctorId, date, shift, and startTime are required.' });
    }

    try {
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const workSchedule = await DoctorWorkSchedule.findOne({
            doctorId,
            date: targetDate,
        });

        if (!workSchedule) {
            return res.status(400).json({ message: `Doctor does not have a work schedule for ${date}.` });
        }

        const chosenShiftDetails = workSchedule.shifts.find(s => s.shift === shift);
        if (!chosenShiftDetails) {
            return res.status(400).json({ message: `Doctor does not work the ${shift} shift on ${date}.` });
        }

        const shiftStartMinutes = timeToMinutes(chosenShiftDetails.startTime);
        const shiftEndMinutes = timeToMinutes(chosenShiftDetails.endTime);
        const requestedStartMinutes = timeToMinutes(startTime);

        if (requestedStartMinutes < shiftStartMinutes ||
            requestedStartMinutes >= shiftEndMinutes ||
            (requestedStartMinutes + DEFAULT_APPOINTMENT_DURATION_MINUTES) > shiftEndMinutes) {
            return res.status(400).json({ message: `Time slot ${startTime} is not valid for the ${shift} shift.` });
        }

        const existingAppointment = await Appointment.findOne({
            doctorId,
            date: targetDate,
            startTime,
            status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'completed'] } // Cập nhật ở đây
        });

        if (existingAppointment) {
            return res.status(400).json({ message: `Time slot ${startTime} on ${date} is already booked.` });
        }

        const appointmentEndTime = minutesToTime(requestedStartMinutes + DEFAULT_APPOINTMENT_DURATION_MINUTES);

        const appointment = await Appointment.create({
            patientId,
            doctorId,
            date: targetDate,
            shift,
            startTime,
            endTime: appointmentEndTime,
            durationInMinutes: DEFAULT_APPOINTMENT_DURATION_MINUTES,
            reasonForVisit: reasonForVisit || '',
            status: 'pending', // Cập nhật ở đây
        });
        res.status(201).json(appointment);
    } catch (error) {
        console.error(error);
        if (error.code === 11000 && error.keyPattern && error.keyPattern['patientId'] && error.keyPattern['date'] && error.keyPattern['startTime']) {
            return res.status(400).json({ message: 'You already have an appointment at this time.' });
        }
        res.status(500).json({ message: 'Server error while creating appointment.' });
    }
};

const getMyAppointments = async (req, res) => {
    const patientId = req.user.id;
    const { status, period } = req.query;

    try {
        const query = { patientId };
        if (status) {
            query.status = status; // Client sẽ gửi query param status bằng tiếng Anh
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (period === 'upcoming') {
            query.date = { $gte: today };
        } else if (period === 'past') {
            query.date = { $lt: today };
        }

        const appointments = await Appointment.find(query)
            .populate({
                path: 'doctorId',
                select: 'name specialization avatar clinicInfo.name',
                model: User
            })
            .sort({ date: 'desc', startTime: 'asc' });
        res.status(200).json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching appointments.' });
    }
};

const cancelMyAppointment = async (req, res) => {
    const patientId = req.user.id;
    const { appointmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }
        if (appointment.patientId.toString() !== patientId) {
            return res.status(403).json({ message: 'You are not authorized to cancel this appointment.' });
        }

        const now = new Date();
        const appointmentDateTime = new Date(appointment.date);
        const [hours, minutes] = appointment.startTime.split(':');
        appointmentDateTime.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

        const timeDifferenceHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (timeDifferenceHours < 24 &&
            (appointment.status === 'confirmed' || appointment.status === 'pending')) { // Cập nhật ở đây
            return res.status(400).json({ message: 'Cannot cancel appointment less than 24 hours in advance.' });
        }

        if (['completed', 'cancelled_by_patient', 'cancelled_by_doctor', 'rejected'].includes(appointment.status)) { // Cập nhật ở đây
            return res.status(400).json({ message: `Cannot cancel appointment with status "${appointment.status}".` });
        }

        appointment.status = 'cancelled_by_patient'; // Cập nhật ở đây
        await appointment.save();
        res.status(200).json({ message: 'Appointment cancelled successfully.', appointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while cancelling appointment.' });
    }
};

module.exports = {
    getAvailableTimeSlots,
    createAppointment,
    getMyAppointments,
    cancelMyAppointment,
};