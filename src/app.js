require('dotenv').config()
const express = require('express');
const app = express();
const port = process.env.PORT;
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcrypt');
const auth = require('./middleware/auth')
const Product = require("./models/Product");
const cookieParser = require('cookie-parser');
require("./db/conn");
const Query = require("./models/query");
const User = require("./models/User");
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false })) // i want to get all the data of the form

const staticPath = path.join(__dirname, "../public");
const templatePath = path.join(__dirname, "../templates/views");
const partialsPath = path.join(__dirname, "../templates/partials");

app.use(express.static(staticPath));
app.set("view engine", "hbs");
app.set("views", templatePath);
hbs.registerPartials(partialsPath);


const getData = async(limit) => {
    try{
        const products = await Product.find().limit(limit);
        console.log(products.length)
        // return product
    }
    catch(err){
        console.log(err);
    }

}


app.get('/', (req, res) => {
    getData(6);
    res.render("index");
})

app.get('/account-details', auth, (req, res) => {
    res.render("account-details");
})

app.get('/search', (req, res) => {
    res.status(200).render('search');
})

app.get('/products', (req, res) => {
    res.status(200).render('products');
})

app.get('/productDetails', (req, res) => {
    res.status(200).render('productDetails')
})

app.post('/query', async (req, res) => {
    try {
        const registerQuery = new Query({
            name: req.body.name,
            email: req.body.email,
            query: req.body.query
        })

        const querySent = await registerQuery.save();
        res.send(querySent);
    } catch (err) {
        res.status(400).send(err);
    }
})


app.post('/register', async (req, res) => {
    try {
        const registerUser = new User({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            gender: req.body.gender,
            password: req.body.password,
            cpass: req.body.cpass
        });

        const exists = await User.findOne({ email: req.body.email });

        if (exists) {
            res.status(400).send("You already have an account. Please login.");
        } else if (req.body.cpass !== req.body.password) {
            res.status(400).send("Password and confirm password do not match.");
        } else {
            const token = await registerUser.generateToken();
            res.cookie("jwt", token);

            console.log(token);
            const registered = await registerUser.save();
            res.status(200).send("Registration successful!. Please login now");

        }

    } catch (err) {
        console.log("Error fetching details");
        res.status(400).send("There is an error: " + err);
    }
});


app.post('/log-in', async (req, res) => {

    try {
        const email = req.body.email
        const password = req.body.password

        const userEmail = await User.findOne({ email: email });
        // console.log(userEmail);
        // res.send(userEmail);

        const isMatch = await bcrypt.compare(password, userEmail.password)

        console.log(isMatch);

        const token = await userEmail.generateToken();
        //console.log(token);

        const expirationDate = new Date();
        //browser will remember the user for 5 days after login
        expirationDate.setDate(expirationDate.getDate() + 5); // Set the expiration date to 7 days from now
        res.cookie("jwt", token, { expires: expirationDate, httpOnly: true, secure: true });

        console.log("cookie made");

        if (isMatch) {
            res.status(201).render("index");
        } else {
            res.send("Invalid details");
        }


    } catch (err) {
        res.send("In try and catch block " + err);
    }
})




app.listen(port, () => {
    console.log('Connection established on port 3000');
})


