const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true,
    },
    shift: {
        type: String,
        required: true,
        enum: ['Sáng', 'Chiều', 'Tối'], // Giữ tiếng Việt cho ca làm việc nếu phù hợp ngữ cảnh trong nước
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        // required: true, // Sẽ được tính toán
    },
    durationInMinutes: {
        type: Number,
        default: 30
    },
    reasonForVisit: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        required: true,
        enum: [
            'pending', // Chờ xác nhận
            'confirmed', // Đã xác nhận
            'rejected', // Từ chối
            'cancelled_by_patient', // Đã hủy bởi bệnh nhân
            'cancelled_by_doctor', // Đã hủy bởi bác sĩ
            'completed' // Đã khám xong
        ],
        default: 'pending', // Trạng thái mặc định khi bệnh nhân đặt
    },
    notesByDoctor: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

appointmentSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });
appointmentSchema.index({ patientId: 1, date: 1, startTime: 1 });


const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;