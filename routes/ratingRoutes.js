const express = require('express');
const { createRating, getRatingsForDoctor } = require('../controllers/ratingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Bệnh nhân tạo đánh giá (yêu cầu đăng nhập và là Patient)
router.post('/', protect, authorize('Patient'), createRating);

// API công khai để xem các đánh giá của một bác sĩ (nếu cần)
router.get('/doctor/:doctorId', getRatingsForDoctor);


module.exports = router;