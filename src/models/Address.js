const mongoose = require('mongoose');
const validator = require('validator');

const addressSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: [true, "Please provide your full name"]
    },
    mnumber: {
        type: Number,
        required: [true, "Please provide your mobile number"]
    },
    pincode: {
        type: Number,
        required: [true, "Please provide your pincode"]
    },
    flat: {
        type: String,
        required: [true, "Please provide your address"]
    },
    area: {
        type: String,
        required: [true, "Please provide the details"]
    },
    city: {
        type: String,
        required: [true, "Please provide your city"]
    }
});

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;