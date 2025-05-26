const mongoose = require('mongoose');

const workShiftSchema = new mongoose.Schema({
    shift: {
        type: String,
        required: true,
        enum: ['Sáng', 'Chiều', 'Tối'],
    },
    startTime: {
        type: String, // "HH:mm"
        required: true,
    },
    endTime: {
        type: String, // "HH:mm"
        required: true,
    },
});

const doctorWorkScheduleSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Tham chiếu đến User, sẽ lọc role='Doctor' ở logic
        required: true,
    },
    date: {
        type: Date, // Chỉ lưu ngày, không lưu giờ
        required: true,
    },
    shifts: [workShiftSchema],
}, {
    timestamps: true,
});

doctorWorkScheduleSchema.index({ doctorId: 1, date: 1 }, { unique: true });

const DoctorWorkSchedule = mongoose.model('DoctorWorkSchedule', doctorWorkScheduleSchema);

module.exports = DoctorWorkSchedule;