const mongoose = require('mongoose');
const validator = require('validator');

const querySchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Please enter correct email");
            }
        }
    },
    query:{
        type:String,
        required:true
    }
})

const Query = new mongoose.model("Query",querySchema);
module.exports = Query;