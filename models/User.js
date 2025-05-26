const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const baseOptions = {
    discriminatorKey: 'role',
    collection: 'users',
    timestamps: true,
};

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: function () { return !this.phoneNumber; },
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Vui lòng cung cấp email hợp lệ'],
    },
    phoneNumber: {
        type: String,
        required: function () { return !this.email; },
        unique: true,
        sparse: true,
        trim: true,
        // validate: [validator.isMobilePhone, 'Vui lòng cung cấp số điện thoại hợp lệ'] // Cân nhắc validator cụ thể cho SĐT Việt Nam
    },
    password: {
        type: String,
        required: [true, 'Mật khẩu là bắt buộc'],
        minlength: 6,
        select: false,
    },
    name: {
        type: String,
        required: [true, 'Họ tên là bắt buộc'],
        trim: true,
    },
    avatar: {
        type: String,
        default: 'default-avatar.jpg',
    },
}, baseOptions);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;