const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema({
    firstname:{
        type:String,
        required:true
    },

    lastname:{
        type:String,
        required:true
    },
    
    email:{
        type:String,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Please enter correct Email")
            }
        },
    },

    password:{
        type:String,
        required:true
    },

    cpass:{
        type:String,
        required:true
    },

    gender:{
        type:String,
        enum:['male','female','other'],
        required:true
    },

    isAdmin:{
        type:String,
        default:false
    },

    tokens:[{
        token:{
            type:String,
            required:true       
        }
    }]    
})

userSchema.methods.generateToken= async function(){
    const token = jwt.sign({_id:this._id.toString()},process.env.SECRET_KEY)
    this.tokens  = this.tokens.concat({token:token})
    await this.save();
    return token;
}

//converting password into hash
userSchema.pre("save", async function (next) { //this is being used for hashing before save 
    // const passwordHash = await bcrypt.hash(password,10);
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password,10)
    }
    next() //next makes sure the save function is completed
})


const User = new mongoose.model("User", userSchema);

module.exports = User;

