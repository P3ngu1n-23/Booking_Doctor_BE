const express = require('express');
const {
    registerPatient,
    loginUser,
    getMyProfile,
    updateMyProfile,
    changePassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register/patient', registerPatient);
router.post('/login', loginUser); 

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/password', protect, changePassword);


module.exports = router;