const jwt = require('jsonwebtoken');
const User = require("../models/User");

const auth = async (req,res,next) => {
    console.log("here")
    try{    
        const token = req.cookies.jwt;
        // console.log(token);

        if(!token){
            
        }
        const verifyUser = jwt.verify(token,process.env.SECRET_KEY); 
        // console.log(verifyUser)

        const user = await User.findOne({_id:verifyUser._id}) //getting the details of that user
        // console.log(user);
        
        req.token = token;
        req.user = user;
        next();
    } 
    catch(err){
        res.render('register')
        
    }
}

module.exports = auth;