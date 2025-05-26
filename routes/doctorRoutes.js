const express = require('express');
const {
  createOrUpdateWorkSchedule,
  getMyWorkSchedules,
  getWorkScheduleByDate,
  deleteWorkSchedule,
  getDoctorAppointments, // Thêm
  getAppointmentDetailsForDoctor, // Thêm
  updateAppointmentStatusByDoctor, // Thêm
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('Doctor'));

// Quản lý lịch làm việc
router.route('/me/schedules')
  .post(createOrUpdateWorkSchedule)
  .get(getMyWorkSchedules);

router.route('/me/schedules/:date')
  .get(getWorkScheduleByDate)
  .delete(deleteWorkSchedule);

// Quản lý lịch hẹn của bác sĩ
router.get('/me/appointments', getDoctorAppointments); 
router.get('/me/appointments/:appointmentId', getAppointmentDetailsForDoctor); 
router.put('/me/appointments/:appointmentId', updateAppointmentStatusByDoctor); 


module.exports = router;