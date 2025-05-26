const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const ratingRoutes = require('./routes/ratingRoutes'); 
const chatbotRoutes = require('./routes/chatbotRoutes');
const { loadChatbotResources } = require('./controllers/chatbotController');


dotenv.config();
connectDB();

loadChatbotResources().then(() => {
    console.log("Chatbot resources loaded successfully.");
}).catch(err => {
    console.error("Failed to load chatbot resources on startup:", err);
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Đặt Lịch Phòng Khám Đang Chạy...');
});

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/chatbot', chatbotRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});