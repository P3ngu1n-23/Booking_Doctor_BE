// doctorController.js
const DoctorWorkSchedule = require('../models/DoctorWorkSchedule');
const Doctor = require('../models/Doctor'); // Mặc dù không dùng trực tiếp ở các hàm mới, nhưng giữ lại nếu cần
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Để populate thông tin bệnh nhân
const mongoose = require('mongoose');


// createOrUpdateWorkSchedule, getMyWorkSchedules, getWorkScheduleByDate, deleteWorkSchedule (đã có từ trước)
// ... (giữ nguyên các hàm đã có) ...
const createOrUpdateWorkSchedule = async (req, res) => {
  const { date, shifts } = req.body;
  const doctorId = req.user.id;

  if (!date || !shifts || !Array.isArray(shifts) || shifts.length === 0) {
    return res.status(400).json({ message: 'Ngày và danh sách ca làm việc là bắt buộc.' });
  }

  for (const s of shifts) {
    if (!s.shift || !s.startTime || !s.endTime) {
      return res.status(400).json({ message: 'Mỗi ca làm việc phải có shift, startTime, và endTime.' });
    }
  }

  try {
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const workSchedule = await DoctorWorkSchedule.findOneAndUpdate(
      { doctorId, date: targetDate },
      { doctorId, date: targetDate, shifts },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json(workSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo/cập nhật lịch làm việc.' });
  }
};

const getMyWorkSchedules = async (req, res) => {
  const doctorId = req.user.id;
  const { startDate, endDate } = req.query;

  try {
    const query = { doctorId };
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      query.date = { $gte: start };
    }

    const schedules = await DoctorWorkSchedule.find(query).sort({ date: 'asc' });
    res.status(200).json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch làm việc.' });
  }
};

const getWorkScheduleByDate = async (req, res) => {
  const doctorId = req.user.id;
  const { date } = req.params;

  if (!date) {
    return res.status(400).json({ message: 'Ngày là bắt buộc.' });
  }

  try {
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const schedule = await DoctorWorkSchedule.findOne({ doctorId, date: targetDate });
    if (!schedule) {
      return res.status(404).json({ message: 'Không tìm thấy lịch làm việc cho ngày này.' });
    }
    res.status(200).json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch làm việc theo ngày.' });
  }
};


const deleteWorkSchedule = async (req, res) => {
  const { date } = req.params;
  const doctorId = req.user.id;

  if (!date) {
    return res.status(400).json({ message: 'Ngày là bắt buộc.' });
  }

  try {
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const existingAppointments = await Appointment.find({
      doctorId: doctorId,
      date: targetDate,
      status: { $in: ['pending', 'confirmed'] } // Sử dụng status tiếng Anh
    });

    if (existingAppointments.length > 0) {
      return res.status(400).json({ message: 'Không thể xóa lịch làm việc cho ngày đã có lịch hẹn. Vui lòng quản lý các lịch hẹn liên quan trước.' });
    }

    const schedule = await DoctorWorkSchedule.findOneAndDelete({ doctorId, date: targetDate });
    if (!schedule) {
      return res.status(404).json({ message: 'Không tìm thấy lịch làm việc để xóa.' });
    }
    res.status(200).json({ message: 'Xóa lịch làm việc thành công.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa lịch làm việc.' });
  }
};


// Hàm mới cho quản lý lịch hẹn của bác sĩ
const getDoctorAppointments = async (req, res) => {
  const doctorId = req.user.id;
  const { status, date, patientName } = req.query; // Thêm patientName để tìm kiếm

  try {
    const query = { doctorId };
    if (status) {
      query.status = status; // status tiếng Anh
    }
    if (date) {
      const targetDate = new Date(date);
      targetDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDay };
    }

    let patientIds = [];
    if (patientName) {
      const patients = await User.find({
        name: { $regex: patientName, $options: 'i' },
        role: 'Patient'
      }).select('_id');
      patientIds = patients.map(p => p._id);
      if (patientIds.length === 0 && patientName) { // Nếu tìm tên bệnh nhân mà không ra ID nào thì không cần query appointment nữa
        return res.status(200).json([]);
      }
      query.patientId = { $in: patientIds };
    }


    const appointments = await Appointment.find(query)
      .populate({
        path: 'patientId',
        select: 'name dateOfBirth gender email phoneNumber reasonForVisit', // Thông tin cơ bản bệnh nhân [cite: 12]
        model: User // Hoặc Patient nếu muốn lấy thêm trường riêng của Patient
      })
      .sort({ date: 'asc', startTime: 'asc' });

    // Tính tuổi cho bệnh nhân nếu có dateOfBirth [cite: 12]
    const appointmentsWithAge = appointments.map(app => {
      const appObj = app.toObject();
      if (appObj.patientId && appObj.patientId.dateOfBirth) {
        const birthDate = new Date(appObj.patientId.dateOfBirth);
        let age = new Date().getFullYear() - birthDate.getFullYear();
        const m = new Date().getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
          age--;
        }
        appObj.patientId.age = age;
      }
      // Giữ lại reasonForVisit ở cấp appointment nếu có [cite: 12]
      // appObj.reasonForVisit = app.reasonForVisit; // Đã có sẵn trong appObj từ model Appointment
      return appObj;
    });

    res.status(200).json(appointmentsWithAge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching doctor appointments.' });
  }
};

const getAppointmentDetailsForDoctor = async (req, res) => {
  const doctorId = req.user.id;
  const { appointmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' });
  }

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate({
        path: 'patientId',
        select: 'name dateOfBirth gender email phoneNumber address avatar', // Lấy thêm thông tin chi tiết
        model: User
      });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
    }

    const appObj = appointment.toObject();
    if (appObj.patientId && appObj.patientId.dateOfBirth) {
      const birthDate = new Date(appObj.patientId.dateOfBirth);
      let age = new Date().getFullYear() - birthDate.getFullYear();
      const m = new Date().getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
        age--;
      }
      appObj.patientId.age = age;
    }

    res.status(200).json(appObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching appointment details.' });
  }
};

const updateAppointmentStatusByDoctor = async (req, res) => {
  const doctorId = req.user.id;
  const { appointmentId } = req.params;
  const { status, notesByDoctor } = req.body; // status mới: 'confirmed', 'rejected', 'completed' [cite: 13]

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' });
  }

  if (!status || !['confirmed', 'rejected', 'completed', 'cancelled_by_doctor'].includes(status)) { // Thêm cancelled_by_doctor
    return res.status(400).json({ message: 'Invalid status value. Allowed: confirmed, rejected, completed, cancelled_by_doctor.' });
  }

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
    }

    // Logic kiểm tra chuyển đổi trạng thái hợp lệ (ví dụ)
    if (appointment.status === 'pending' && !['confirmed', 'rejected', 'cancelled_by_doctor'].includes(status)) {
      return res.status(400).json({ message: `Cannot change status from 'pending' to '${status}'. Allowed: confirmed, rejected, cancelled_by_doctor.` });
    }
    if (appointment.status === 'confirmed' && !['completed', 'cancelled_by_doctor'].includes(status)) {
      return res.status(400).json({ message: `Cannot change status from 'confirmed' to '${status}'. Allowed: completed, cancelled_by_doctor.` });
    }
    if (['completed', 'rejected', 'cancelled_by_patient', 'cancelled_by_doctor'].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot change status from '${appointment.status}'. Appointment is finalized or cancelled.` });
    }


    appointment.status = status;
    if (notesByDoctor !== undefined) { // Bác sĩ có thể thêm ghi chú khi hoàn thành hoặc các trạng thái khác
      appointment.notesByDoctor = notesByDoctor;
    }

    await appointment.save();

    // Gửi thông báo cho bệnh nhân (ngoài phạm vi) [cite: 26, 27]
    // Ví dụ: nếu status là 'confirmed', gửi thông báo "lịch hẹn được xác nhận" [cite: 27]
    // Ví dụ: nếu status là 'rejected', gửi thông báo "lịch hẹn bị từ chối" [cite: 27]
    // Ví dụ: nếu status là 'cancelled_by_doctor', gửi thông báo "lịch hẹn bị hủy bởi bác sĩ" [cite: 26]

    res.status(200).json({ message: 'Appointment status updated successfully.', appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating appointment status.' });
  }
};


module.exports = {
  createOrUpdateWorkSchedule,
  getMyWorkSchedules,
  getWorkScheduleByDate,
  deleteWorkSchedule,
  getDoctorAppointments, // Thêm hàm mới
  getAppointmentDetailsForDoctor, // Thêm hàm mới
  updateAppointmentStatusByDoctor, // Thêm hàm mới
};