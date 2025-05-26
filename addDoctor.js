const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');

dotenv.config(); // Load biến môi trường từ .env

const predefinedPasswordHash = '$2b$10$HArwxAxDkBFjj4w.eFXTpOL7m9aHp11qApmepKw9URV6WnBol7FbG';
const initialEmailCounter = 11;

const firstNames = ["Văn", "Thị", "Hữu", "Minh", "Ngọc", "Đức", "Thu", "Hoàng", "Kim", "Xuân"];
const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô"];
const middleNames = ["Thị", "Văn", "Minh", "Ngọc", "Đức", "Hoài", "Bảo", "Gia", "Khánh", "Phương"];

const specializations = [
  "Tim mạch", "Nội tiết", "Tiêu hóa", "Hô hấp", "Thần kinh",
  "Cơ xương khớp", "Da liễu", "Tai mũi họng", "Mắt", "Nhi khoa",
  "Sản phụ khoa", "Ung bướu", "Y học cổ truyền", "Chẩn đoán hình ảnh", "Gây mê hồi sức"
];
const experiences = ["3 năm kinh nghiệm", "5 năm kinh nghiệm", "7 năm kinh nghiệm", "10 năm kinh nghiệm", "Trên 10 năm kinh nghiệm"];
const qualifications = ["Bác sĩ Đa khoa", "Thạc sĩ Y học", "Tiến sĩ Y học", "Bác sĩ Chuyên khoa I", "Bác sĩ Chuyên khoa II", "Phó Giáo sư", "Giáo sư"];
const clinicNames = [
  "Phòng khám Đa khoa An Sinh", "Phòng khám Quốc tế Việt Sing", "Bệnh viện Đa khoa Medlatec cơ sở Hà Nội",
  "Phòng khám Đa khoa Thu Cúc", "Phòng khám Gia đình Hà Nội", "Trung tâm Y khoa Số 1 Hà Nội",
  "Phòng khám Chuyên khoa XYZ", "Phòng khám Sức Khỏe Vàng"
];
const hanoiAddresses = [
  "1 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", "78 Giải Phóng, Đống Đa, Hà Nội", "108 Lò Đúc, Hai Bà Trưng, Hà Nội",
  "219 Lê Duẩn, Hoàn Kiếm, Hà Nội", "52 Nguyễn Chí Thanh, Đống Đa, Hà Nội", "1E Trường Chinh, Thanh Xuân, Hà Nội",
  "458 Minh Khai, Hai Bà Trưng, Hà Nội", "150 Phố Huế, Hai Bà Trưng, Hà Nội", "35 Trần Phú, Ba Đình, Hà Nội",
  "89 Nguyễn Khuyến, Đống Đa, Hà Nội"
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateRandomPhoneNumber = () => {
  let phoneNumber = '09'; // Bắt đầu với 09
  for (let i = 0; i < 8; i++) {
    phoneNumber += Math.floor(Math.random() * 10);
  }
  return phoneNumber;
};

const doctorsData = [];

for (let i = 0; i < 30; i++) {
  const lastName = getRandomElement(lastNames);
  const middleName = getRandomElement(middleNames);
  const firstName = getRandomElement(firstNames);
  const fullName = `${lastName} ${middleName} ${firstName}`;

  const clinicAddress = getRandomElement(hanoiAddresses);
  const clinicName = getRandomElement(clinicNames);

  doctorsData.push({
    name: fullName,
    email: `longkold${initialEmailCounter + i}@gmail.com`,
    phoneNumber: generateRandomPhoneNumber(),
    password: predefinedPasswordHash, // Mật khẩu đã hash sẵn
    role: 'Doctor', // Quan trọng để discriminator hoạt động
    avatar: `https://i.pravatar.cc/150?u=doctor${i}`, // Avatar ngẫu nhiên từ pravatar
    specialization: getRandomElement(specializations),
    experience: getRandomElement(experiences),
    qualifications: getRandomElement(qualifications),
    description: `Bác sĩ ${fullName} chuyên khoa ${getRandomElement(specializations)}, tận tâm với nhiều năm kinh nghiệm. Hiện đang công tác tại ${clinicName}.`,
    clinicInfo: {
      name: clinicName,
      address: clinicAddress,
      phoneNumber: generateRandomPhoneNumber()
    },
    averageRating: parseFloat((Math.random() * (5 - 3.5) + 3.5).toFixed(1)), // Random rating từ 3.5 đến 5
    numberOfRatings: Math.floor(Math.random() * 50) + 5, // Random số lượng rating
  });
}

const seedDoctors = async () => {


  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await Doctor.insertMany(doctorsData);

    console.log('SUCCESS: 20 bác sĩ đã được thêm vào cơ sở dữ liệu!');
    process.exit(); // Thoát khỏi script sau khi hoàn thành
  } catch (error) {
    console.error('ERROR seeding doctors:', error);
    process.exit(1); // Thoát với mã lỗi
  }
};

// Chạy hàm seed
seedDoctors();