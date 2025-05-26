const Doctor = require('../models/Doctor');
const DoctorWorkSchedule = require('../models/DoctorWorkSchedule');
const User = require('../models/User'); // Cần User để populate thông tin Doctor

const searchDoctors = async (req, res) => {
  const { specialization, name } = req.query;
  const query = { role: 'Doctor' }; // Luôn tìm User có role là Doctor

  if (specialization) {
    query.specialization = { $regex: specialization, $options: 'i' };
  }
  if (name) {
    // Tìm theo tên User (Doctor)
    query.name = { $regex: name, $options: 'i' };
  }

  try {
    // Tìm các User là Doctor, sau đó populate các trường từ Doctor schema
    // Mongoose sẽ tự động tìm các document trong collection 'users' có 'role' là 'Doctor'
    // và có các trường 'specialization', 'name' (từ base User) khớp.
    const doctors = await User.find(query)
                              .select('name avatar specialization experience clinicInfo averageRating numberOfRatings');
    // Lưu ý: 'specialization', 'experience', 'clinicInfo', 'averageRating', 'numberOfRatings'
    // là các trường của Doctor schema, Mongoose discriminators sẽ xử lý việc truy cập này.

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bác sĩ phù hợp.' });
    }
    res.status(200).json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tìm kiếm bác sĩ.' });
  }
};

const getDoctorDetailsAndAvailability = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const doctor = await Doctor.findById(doctorId)
                               .select('-password'); // Doctor model kế thừa từ User

    if (!doctor) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });
    }

    // Lấy lịch làm việc trong 7 ngày tới (ví dụ)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setUTCDate(today.getUTCDate() + 7);
    sevenDaysLater.setUTCHours(23,59,59,999);


    const workSchedules = await DoctorWorkSchedule.find({
      doctorId: doctorId,
      date: { $gte: today, $lte: sevenDaysLater },
    }).sort({ date: 'asc' });

    // Chuyển đổi doctor document sang plain object để thêm workSchedules
    const doctorDetails = doctor.toObject();
    doctorDetails.upcomingWorkSchedules = workSchedules;

    res.status(200).json(doctorDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy thông tin chi tiết bác sĩ.' });
  }
};

module.exports = {
  searchDoctors,
  getDoctorDetailsAndAvailability,
};