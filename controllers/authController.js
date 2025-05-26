// authController.js
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor'); // Thêm Doctor model
const generateToken = require('../utils/generateToken');

const registerPatient = async (req, res) => {
  const { email, phoneNumber, password, name, dateOfBirth, gender, address, avatar } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.'});
  }

  if (!email && !phoneNumber) {
    return res.status(400).json({ message: 'Cần cung cấp email hoặc số điện thoại.' });
  }

  try {
    let existingUser;
    if (email) {
      existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã được sử dụng.' });
      }
    }
    if (phoneNumber) {
      existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng.' });
      }
    }

    const patient = await Patient.create({
      email,
      phoneNumber,
      password,
      name,
      dateOfBirth,
      gender,
      address,
      avatar: avatar || undefined,
    });

    if (patient) {
      res.status(201).json({
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phoneNumber: patient.phoneNumber,
        role: patient.role,
        token: generateToken(patient._id, patient.role),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu người dùng không hợp lệ.' });
    }
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
         if (error.keyPattern.email) {
            return res.status(400).json({ message: 'Email đã tồn tại.' });
        }
        if (error.keyPattern.phoneNumber) {
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại.' });
        }
    }
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký.' });
  }
};

const loginUser = async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp email/SĐT và mật khẩu.' });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: loginId }, { phoneNumber: loginId }],
    }).select('+password');

    if (user && (await user.comparePassword(password))) {
      // Lấy thêm thông tin chi tiết dựa trên role
      let userDetails = user.toObject(); // Chuyển Mongoose document thành plain object
      if (user.role === 'Patient') {
          const patientDetails = await Patient.findById(user._id);
          if(patientDetails) userDetails = {...userDetails, ...patientDetails.toObject()};
      } else if (user.role === 'Doctor') {
          const doctorDetails = await Doctor.findById(user._id);
          if(doctorDetails) userDetails = {...userDetails, ...doctorDetails.toObject()};
      }
      delete userDetails.password;


      res.json({
        ...userDetails,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Email/SĐT hoặc mật khẩu không đúng.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.' });
  }
};

const getMyProfile = async (req, res) => {
  try {
    let userProfile;
    if (req.user.role === 'Patient') {
        userProfile = await Patient.findById(req.user.id).select('-password');
    } else if (req.user.role === 'Doctor') {
        userProfile = await Doctor.findById(req.user.id).select('-password');
    } else {
        userProfile = await User.findById(req.user.id).select('-password');
    }

    if (userProfile) {
      res.json(userProfile);
    } else {
      res.status(404).json({ message: 'Người dùng không tìm thấy.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
};


const updateMyProfile = async (req, res) => {
  const { name, avatar, phoneNumber, email,
          dateOfBirth, gender, address, // Patient fields
          specialization, experience, qualifications, description, clinicInfo // Doctor fields [cite: 9]
        } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tìm thấy.' });
    }

    if (email && email !== user.email) {
        const existingUser = await User.findOne({ email: email });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({ message: 'Email đã được sử dụng bởi tài khoản khác.' });
        }
        user.email = email;
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
        const existingUser = await User.findOne({ phoneNumber: phoneNumber });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi tài khoản khác.' });
        }
        user.phoneNumber = phoneNumber;
    }

    user.name = name !== undefined ? name : user.name;
    user.avatar = avatar !== undefined ? avatar : user.avatar;

    let updatedProfile;

    if (user.role === 'Patient') {
        const patient = await Patient.findById(req.user.id);
        if(patient){
            patient.name = user.name;
            patient.avatar = user.avatar;
            patient.email = user.email; // Cập nhật từ user base
            patient.phoneNumber = user.phoneNumber; // Cập nhật từ user base

            patient.dateOfBirth = dateOfBirth !== undefined ? dateOfBirth : patient.dateOfBirth;
            patient.gender = gender !== undefined ? gender : patient.gender;
            patient.address = address !== undefined ? address : patient.address;
            updatedProfile = await patient.save();
        } else {
             return res.status(404).json({ message: 'Thông tin bệnh nhân không tìm thấy.' });
        }
    } else if (user.role === 'Doctor') {
        const doctor = await Doctor.findById(req.user.id);
        if(doctor){
            doctor.name = user.name;
            doctor.avatar = user.avatar;
            doctor.email = user.email; // Cập nhật từ user base
            doctor.phoneNumber = user.phoneNumber; // Cập nhật từ user base

            doctor.specialization = specialization !== undefined ? specialization : doctor.specialization; // [cite: 9]
            doctor.experience = experience !== undefined ? experience : doctor.experience; // [cite: 9]
            doctor.qualifications = qualifications !== undefined ? qualifications : doctor.qualifications; // [cite: 9]
            doctor.description = description !== undefined ? description : doctor.description; // [cite: 9]
            if (clinicInfo !== undefined) { // [cite: 9]
                 doctor.clinicInfo = {
                    name: clinicInfo.name !== undefined ? clinicInfo.name : doctor.clinicInfo.name,
                    address: clinicInfo.address !== undefined ? clinicInfo.address : doctor.clinicInfo.address,
                    phoneNumber: clinicInfo.phoneNumber !== undefined ? clinicInfo.phoneNumber : doctor.clinicInfo.phoneNumber,
                };
            }
            updatedProfile = await doctor.save();
        } else {
            return res.status(404).json({ message: 'Thông tin bác sĩ không tìm thấy.' });
        }
    } else {
        // For generic user if any other roles exist in future
        updatedProfile = await user.save();
    }
    
    // Loại bỏ password trước khi trả về
    const responseProfile = updatedProfile.toObject();
    delete responseProfile.password;

    res.json(responseProfile);

  } catch (error) {
    console.error(error);
     if (error.code === 11000) {
         if (error.keyPattern && error.keyPattern.email) { // Kiểm tra keyPattern tồn tại
            return res.status(400).json({ message: 'Email đã tồn tại.' });
        }
        if (error.keyPattern && error.keyPattern.phoneNumber) { // Kiểm tra keyPattern tồn tại
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại.' });
        }
    }
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thông tin.' });
  }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    try {
        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tìm thấy.' });
        }

        if (await user.comparePassword(currentPassword)) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Đổi mật khẩu thành công.' });
        } else {
            res.status(401).json({ message: 'Mật khẩu hiện tại không đúng.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ khi đổi mật khẩu.' });
    }
};


module.exports = {
  registerPatient,
  loginUser,
  getMyProfile,
  updateMyProfile,
  changePassword
};