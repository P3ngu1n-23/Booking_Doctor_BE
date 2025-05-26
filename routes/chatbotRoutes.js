// routes/chatbotRoutes.js
const express = require('express');
const { diagnoseSymptoms } = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware'); // Có thể cần protect nếu chỉ người dùng đăng nhập mới được dùng

const router = express.Router();

router.post('/diagnose', protect, diagnoseSymptoms); // Nếu cần đăng nhập

module.exports = router;