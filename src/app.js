require('dotenv').config()
const express = require('express');
const app = express();
// const exphbs = require('express-handlebars');
const port = process.env.PORT;
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcrypt');
const auth = require('./middleware/auth')
const Product = require("./models/Product");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require("./db/conn");
const Query = require("./models/query");
const User = require("./models/User");
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
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


// Register the custom helper
// hbs.registerHelper('range', function(from, to, incr, block) {
//     var accum = '';
//     for(var i = from; i <= to; i += incr)
//         accum += block.fn(i);
//     return accum;
// });

// hbs.registerHelper('lte', function(v1, v2) {
//     return v1 <= v2;
// });

app.get('/', async (req, res) => {
    const products = await Product.find().limit(6);
    // console.log(products);
    res.render('index', {
        products: products
    })
})

app.get('/account-details', auth, (req, res) => {
    res.render("account-details");
})

app.get('/searchPage', async (req, res) => {
    try {
        const products = await Product.find().skip(6).limit(10);
        res.status(200).render('search', {
            products: products
        });

    } catch (err) {
        res.status(400).send(err);
    }

})

// app.get('/search', (req, res) => {
//     const searchTerm = req.query.query; // Retrieve the 'query' parameter from the request

//     // Process the search term (e.g., query MongoDB, fetch data from external API, etc.)
//     // Example: Log the search term to console
//     console.log('Search Term:', searchTerm);

//     // Return response as needed
//     res.render("products.hbs")
// });

app.get('/products', auth, async (req, res) => {
    try {
        const products = await Product.find().skip(16).limit(14);
        console.log(products);
        res.status(200).render('products', {
            products: products
        });
    } catch (err) {
        console.log(err);
    }
})

app.get('/productDetails/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ id: id });

        if (!product) {
            res.status(404).send('Product not found')
        }

        const token = req.cookies.jwt;
        console.log(token);

        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);

        const user = await User.findOne({ _id: verifyUser._id }) //getting the details of that user
        const isAdmin = user.isAdmin

        res.render('productDetails', {
            product: product,
            isAdmin: isAdmin
        })
    } catch (err) {
        res.status(400).send(err);
    }
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
            cpass: req.body.cpass,
            isAdmin: false
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
        console.log(token);

        console.log(req.user);

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

app.get('/deleteAdmin/:id', async (req, res) => {
    try {
        console.log("here")
        const id = req.params.id;
        const product = await Product.findOne({ id: id });

        if (!product) {
            res.status(404).send('Product not found')
        }

        res.render('deleteAdmin', {
            product: product
        })
    } catch (err) {
        req.status(400).send(err);
    }


})


app.get('/editAdmin/:id', async (req, res) => {
    try {
        console.log("here")
        const id = req.params.id;
        const product = await Product.findOne({ id: id });

        if (!product) {
            res.status(404).send('Product not found')
        }

        res.render('editAdmin', {
            product: product
        })
    } catch (err) {
        req.status(400).send(err);
    }


})


app.get('/logout', auth, async (req, res) => {
    try {
        console.log(req.user);
        res.clearCookie("jwt");
        console.log("logout succesful")
        await req.user.save();
        res.render('register')
    } catch (err) {
        res.status(500).send(err)
    }
})

app.delete('/deleteItem/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const result = await Product.findByIdAndDelete(itemId)
        if (!result) console.log("product isnt found");
        res.render('index')
    } catch (err) {
        res.status(400).send(err);
    }

})

app.post('/editItem/:id', async (req, res) => {
    const newQuantity = req.body.quantity;
    const itemId = req.params.id;

    try {
        const result = await Product.updateOne({ id: itemId }, {
            $set: {
                quantity: newQuantity
            }
        });
        if (result.nModified === 0) {
            console.log("Product not found or quantity unchanged");
        } else {
            console.log("Product updated successfully");
        }

        const products = await Product.find().limit(6);
        res.render('index', {
            products: products
        })

    } catch (err) {
        res.status(400).send(err);
    }
});



app.listen(port, () => {
    console.log('Connection established on port 3000');
})


