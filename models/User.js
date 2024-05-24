const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const UserSchema = new Schema({
    username: {
        type: String,
        min: 6,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const UserModal = model('User', UserSchema);

module.exports = UserModal;