const express = require('express');
const {
    getAvailableTimeSlots,
    createAppointment,
    getMyAppointments,
    cancelMyAppointment,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// API lấy khung giờ trống của bác sĩ (có thể public hoặc yêu cầu đăng nhập tùy)
router.get('/slots', getAvailableTimeSlots); // Query: doctorId, date

// Các API dưới đây yêu cầu bệnh nhân phải đăng nhập
router.use(protect);
router.use(authorize('Patient')); // Chỉ bệnh nhân mới có thể thao tác

router.post('/', createAppointment);
router.get('/my', getMyAppointments); // Query: status (Chờ xác nhận, Đã xác nhận,...), period (upcoming, past)
router.put('/:appointmentId/cancel', cancelMyAppointment);

module.exports = router;