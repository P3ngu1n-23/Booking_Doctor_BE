const express = require('express');
const {
  searchDoctors,
  getDoctorDetailsAndAvailability,
} = require('../controllers/patientController');
// const { protect, authorize } = require('../middleware/authMiddleware'); // Bệnh nhân cũng cần protect cho 1 số route sau này

const router = express.Router();

// Các API này có thể public hoặc yêu cầu đăng nhập tùy theo logic (hiện tại để public)
router.get('/doctors/search', searchDoctors); // Ví dụ: /api/patients/doctors/search?specialization=Tim mạch&name=Minh
router.get('/doctors/:doctorId/details', getDoctorDetailsAndAvailability);


module.exports = router;