const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

// const CartItemSchema = mongoose.Schema({
//     item:{
//         type: Schema.Types.ObjectId,
//         ref: "Product"
//     },
//     quantity:{
//         type:Number,
//         required:true
//     }

// })

const userSchema = mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },

    lastname: {
        type: String,
        required: true
    },

    email: {
        type: String,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Please enter correct Email")
            }
        },
        unique:true
    },

    password: {
        type: String,
        required: true
    },

    cpass: {
        type: String,
        required: true
    },

    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },

    isAdmin: {
        type: Boolean,
        default: false
    },

    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    products: [
        {
            type: Schema.Types.ObjectId,
            ref: "Product"
        },
        
    ],
    orderHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "OrderHistory"
        },
    ],
    wishList:[
        {
            type:Schema.Types.ObjectId,
            ref: "Product"
        }
    ],
    address:[
        {
            type:Schema.Types.ObjectId,
            ref:"Address"
        }
    ]
})

userSchema.methods.generateToken = async function () {
    const token = jwt.sign({ _id: this._id.toString() }, process.env.SECRET_KEY)
    this.tokens = this.tokens.concat({ token: token })
    await this.save();
    return token;
}

//converting password into hash
userSchema.pre("save", async function (next) { //this is being used for hashing before save 
    // const passwordHash = await bcrypt.hash(password,10);
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10)
    }
    next() //next makes sure the save function is completed
})


const User = new mongoose.model("User", userSchema);

module.exports = User;

